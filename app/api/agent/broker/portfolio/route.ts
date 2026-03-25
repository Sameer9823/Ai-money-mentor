/**
 * API Route: /api/broker/portfolio
 * 
 * GET  → Fetch user's saved portfolio with live Yahoo Finance prices
 * POST → Save user's stock holdings to UserMemory
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import UserMemory from '@/models/UserMemory'
import { enrichPortfolioWithLivePrices } from '@/lib/yahooFinanceApi'

interface SavedStock {
  symbol: string
  name: string
  units: number
  buyPrice: number
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id ?? session.user.email!

    await connectDB()
    const memory = await UserMemory.findOne({ userId }).lean()

    if (!memory) {
      return NextResponse.json({
        connected: false,
        portfolio: null,
      })
    }

    // Get saved stocks from UserMemory
    const savedStocks = (memory.stockPortfolio ?? []) as SavedStock[]

    if (savedStocks.length === 0) {
      return NextResponse.json({
        connected: true,
        portfolio: null,
      })
    }

    // Fetch live prices from Yahoo Finance
    const liveStocks = await enrichPortfolioWithLivePrices(savedStocks)

    // Calculate summary metrics
    const totalValue = liveStocks.reduce((sum, s) => sum + s.currentValue, 0)
    const totalInvested = liveStocks.reduce((sum, s) => sum + s.investedAmount, 0)
    const totalPnL = totalValue - totalInvested
    const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

    return NextResponse.json({
      connected: true,
      portfolio: {
        funds: liveStocks,
        summary: {
          totalValue: Math.round(totalValue),
          totalInvested: Math.round(totalInvested),
          totalPnL: Math.round(totalPnL),
          totalPnLPct: Math.round(totalPnLPct * 100) / 100,
          holdingCount: liveStocks.length,
          fetchedAt: new Date().toISOString(),
        },
      },
    })
  } catch (error) {
    console.error('[Portfolio API GET Error]:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id ?? session.user.email!
    const body = await req.json()
    const { stocks } = body as { stocks: SavedStock[] }

    if (!Array.isArray(stocks)) {
      return NextResponse.json(
        { error: 'Invalid stocks array' },
        { status: 400 }
      )
    }

    // Validate stock data
    for (const stock of stocks) {
      if (!stock.symbol || !stock.units || !stock.buyPrice) {
        return NextResponse.json(
          { error: 'Invalid stock data: symbol, units, and buyPrice are required' },
          { status: 400 }
        )
      }
    }

    await connectDB()

    // Save to UserMemory
    await UserMemory.findOneAndUpdate(
      { userId },
      {
        $set: {
          stockPortfolio: stocks,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      message: `${stocks.length} stocks saved successfully`,
    })
  } catch (error) {
    console.error('[Portfolio API POST Error]:', error)
    return NextResponse.json(
      { error: 'Failed to save portfolio' },
      { status: 500 }
    )
  }
}