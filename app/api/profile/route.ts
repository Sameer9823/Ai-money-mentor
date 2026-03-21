import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import FinancialProfile from '@/models/FinancialProfile'
import User from '@/models/User'
import AgentLog from '@/models/AgentLog'

// GET /api/profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const userId = session.user.id ?? session.user.email!
    const profile = await FinancialProfile.findOne({ userId }).lean()

    return NextResponse.json({ profile: profile ?? null })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// PUT /api/profile — update + optionally trigger agent re-run
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    const body = await req.json()
    const { triggerRerun, ...profileData } = body

    await connectDB()

    const existing = await FinancialProfile.findOne({ userId })
    let profile

    if (existing) {
      profile = await FinancialProfile.findOneAndUpdate(
        { userId },
        { ...profileData, $inc: { version: 1 } },
        { new: true }
      )
    } else {
      profile = await FinancialProfile.create({ userId, ...profileData })
    }

    // Trigger agent re-run if requested
    let rerunResult = null
    if (triggerRerun && profile) {
      try {
        const { orchestrate } = await import('@/agents/orchestrator')
        const input = buildAgentInput(profile)
        rerunResult = await orchestrate({
          taskType: 'money_health',
          userId,
          userInput: input,
        })

        // Update latestAnalysis
        await FinancialProfile.findOneAndUpdate(
          { userId },
          {
            'latestAnalysis.healthScore': rerunResult.impactDashboard.retirementReadiness,
            'latestAnalysis.retirementReadiness': rerunResult.impactDashboard.retirementReadiness,
            'latestAnalysis.taxSaved': rerunResult.impactDashboard.taxSaved,
            'latestAnalysis.netWorth': (profile.investments.total ?? 0) - (profile.liabilities.totalDebt ?? 0),
            'latestAnalysis.updatedAt': new Date().toISOString(),
          }
        )
      } catch (e) {
        console.error('Agent rerun failed:', e)
      }
    }

    return NextResponse.json({ profile, rerunResult })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE /api/profile — GDPR-style full data deletion
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    await connectDB()

    // Delete all user data
    const [profileResult, userResult, logsResult] = await Promise.all([
      FinancialProfile.deleteMany({ userId }),
      User.deleteOne({ email: session.user.email }),
      AgentLog.deleteMany({ userId }),
    ])

    // Log deletion event
    console.log(`[GDPR DELETE] userId=${userId} at ${new Date().toISOString()} - profile:${profileResult.deletedCount} user:${userResult.deletedCount} logs:${logsResult.deletedCount}`)

    return NextResponse.json({
      success: true,
      deleted: {
        profile: profileResult.deletedCount,
        user: userResult.deletedCount,
        logs: logsResult.deletedCount,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

function buildAgentInput(profile: InstanceType<typeof FinancialProfile>) {
  return {
    monthlyIncome: profile.income.monthly,
    monthlyExpenses: profile.expenses.monthly,
    savings: profile.savings.total,
    age: profile.personal.age,
    hasEmergencyFund: profile.savings.emergencyMonths > 0,
    emergencyFundMonths: profile.savings.emergencyMonths,
    hasTermInsurance: profile.insurance.hasTermInsurance,
    hasHealthInsurance: profile.insurance.hasHealthInsurance,
    healthCoverAmount: profile.insurance.healthCover,
    totalDebt: profile.liabilities.totalDebt,
    monthlyEMI: profile.expenses.emi,
    investmentAmount: profile.investments.total / 12,
    investmentTypes: ['Mutual Funds', 'SIP'],
    hasPPF: profile.investments.ppf > 0,
    hasNPS: profile.investments.nps > 0,
    section80CInvested: profile.tax.section80C,
    hasRetirementPlan: profile.personal.retirementAge < 60,
  }
}
