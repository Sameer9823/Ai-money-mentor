import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import FinancialProfile from '@/models/FinancialProfile'
import UserMemory from '@/models/UserMemory'
import Timeline from '@/models/Timeline'
import { getNextBestAction, calculateConfidenceScore } from '@/agents/actionAgent'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    await connectDB()

    const [profile, memory] = await Promise.all([
      FinancialProfile.findOne({ userId }).lean(),
      UserMemory.findOne({ userId }).lean(),
    ])

    if (!profile) {
      return NextResponse.json({
        action: null,
        confidenceScore: { score: 0, missingFields: ['Complete your financial profile first'], suggestions: [] },
      })
    }

    const input = {
      monthlyIncome:       profile.income?.monthly ?? 0,
      monthlyExpenses:     profile.expenses?.monthly ?? 0,
      savings:             profile.savings?.total ?? 0,
      emergencyFundMonths: profile.savings?.emergencyMonths ?? 0,
      hasTermInsurance:    profile.insurance?.hasTermInsurance ?? false,
      hasHealthInsurance:  profile.insurance?.hasHealthInsurance ?? false,
      totalDebt:           profile.liabilities?.totalDebt ?? 0,
      monthlyEMI:          profile.expenses?.emi ?? 0,
      investmentAmount:    (profile.investments?.total ?? 0) / 12,
      section80C:          profile.tax?.section80C ?? 0,
      age:                 profile.personal?.age ?? 30,
      riskProfile:         profile.personal?.riskProfile ?? 'moderate',
      retirementAge:       profile.personal?.retirementAge ?? 60,
      memory:              memory as Parameters<typeof getNextBestAction>[0]['memory'],
    }

    const [action, confidence] = await Promise.all([
      getNextBestAction(input),
      Promise.resolve(calculateConfidenceScore(input)),
    ])

    return NextResponse.json({ action, confidenceScore: confidence })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    const { action, status } = await req.json()

    await connectDB()
    await Timeline.create({
      userId,
      actionTaken: status === 'acted' ? action.action : `Ignored: ${action.action}`,
      recommendation: action.action,
      category: action.category,
      impact: action.impact,
      impactValue: action.estimatedValue,
      status,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}