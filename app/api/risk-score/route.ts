import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import FinancialProfile from '@/models/FinancialProfile'
import { calculateRiskScore } from '@/agents/riskScoreAgent'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    await connectDB()

    const profile = await FinancialProfile.findOne({ userId }).lean()
    if (!profile) return NextResponse.json({ riskScore: null })

    const result = calculateRiskScore({
      age:               profile.personal?.age ?? 30,
      monthlyIncome:     profile.income?.monthly ?? 0,
      monthlyEMI:        profile.expenses?.emi ?? 0,
      totalDebt:         profile.liabilities?.totalDebt ?? 0,
      hasTermInsurance:  profile.insurance?.hasTermInsurance ?? false,
      hasHealthInsurance: profile.insurance?.hasHealthInsurance ?? false,
      healthCover:       profile.insurance?.healthCover ?? 0,
      emergencyFundMonths: profile.savings?.emergencyMonths ?? 0,
      equityAllocationPct: profile.investments?.equity
        ? Math.round((profile.investments.equity / Math.max(1, profile.investments.total ?? 1)) * 100)
        : 60,
      largestFundPct:    40, // default — improved when portfolio data available
      investmentAmount:  (profile.investments?.total ?? 0) / 12,
    })

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}