import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import FinancialProfile from '@/models/FinancialProfile'

export interface BenchmarkResult {
  userReturn: number
  nifty50Return: number
  nifty50_1yr: number
  nifty50_3yr: number
  nifty50_5yr: number
  difference: number
  verdict: 'beating' | 'matching' | 'lagging'
  avgIndianInvestorReturn: number
  percentile: string
}

// Fetch NIFTY 50 returns from Yahoo Finance
async function fetchNiftyReturns(): Promise<{ yr1: number; yr3: number; yr5: number }> {
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?range=5y&interval=1mo'
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('Yahoo fetch failed')

    const data = await res.json()
    const closes: number[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    const validCloses = closes.filter((c: number) => c != null && !isNaN(c))

    if (validCloses.length < 12) throw new Error('Insufficient data')

    const latest = validCloses[validCloses.length - 1]
    const yr1ago  = validCloses[Math.max(0, validCloses.length - 13)]
    const yr3ago  = validCloses[Math.max(0, validCloses.length - 37)]
    const yr5ago  = validCloses[0]

    return {
      yr1: Math.round(((latest - yr1ago) / yr1ago) * 1000) / 10,
      yr3: Math.round((Math.pow(latest / yr3ago, 1/3) - 1) * 1000) / 10,
      yr5: Math.round((Math.pow(latest / yr5ago, 1/5) - 1) * 1000) / 10,
    }
  } catch {
    // Fallback to approximate historical averages
    return { yr1: 12.5, yr3: 14.2, yr5: 13.8 }
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    await connectDB()

    const profile = await FinancialProfile.findOne({ userId }).lean()
    const userXIRR = profile?.latestAnalysis?.xirr ?? 0

    const nifty = await fetchNiftyReturns()

    // Average Indian retail investor underperforms by ~3-4%
    const avgIndianReturn = nifty.yr1 - 3.5

    let verdict: BenchmarkResult['verdict'] = 'lagging'
    if (userXIRR >= nifty.yr1 - 1) verdict = 'beating'
    else if (userXIRR >= nifty.yr1 - 3) verdict = 'matching'

    // Approximate percentile
    let percentile = 'Bottom 30%'
    if (userXIRR >= nifty.yr1 + 2) percentile = 'Top 10%'
    else if (userXIRR >= nifty.yr1)   percentile = 'Top 25%'
    else if (userXIRR >= avgIndianReturn) percentile = 'Top 50%'

    const result: BenchmarkResult = {
      userReturn: Math.round(userXIRR * 10) / 10,
      nifty50Return: nifty.yr1,
      nifty50_1yr: nifty.yr1,
      nifty50_3yr: nifty.yr3,
      nifty50_5yr: nifty.yr5,
      difference: Math.round((userXIRR - nifty.yr1) * 10) / 10,
      verdict,
      avgIndianInvestorReturn: Math.round(avgIndianReturn * 10) / 10,
      percentile,
    }

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}