import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import FinancialProfile from '@/models/FinancialProfile'

// POST /api/profile/analysis
// Saves calculated scores back to latestAnalysis so dashboard shows them
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    const body = await req.json()

    const {
      healthScore,
      retirementReadiness,
      taxSaved,
      netWorth,
      xirr,
    } = body

    await connectDB()

    const update: Record<string, unknown> = {}
    if (healthScore        !== undefined) update['latestAnalysis.healthScore']         = healthScore
    if (retirementReadiness !== undefined) update['latestAnalysis.retirementReadiness'] = retirementReadiness
    if (taxSaved           !== undefined) update['latestAnalysis.taxSaved']            = taxSaved
    if (netWorth           !== undefined) update['latestAnalysis.netWorth']            = netWorth
    if (xirr               !== undefined) update['latestAnalysis.xirr']               = xirr
    update['latestAnalysis.updatedAt'] = new Date().toISOString()

    await FinancialProfile.findOneAndUpdate(
      { userId },
      { $set: update },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/profile/analysis:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}