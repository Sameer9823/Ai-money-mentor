import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import FinancialProfile from '@/models/FinancialProfile'
import User from '@/models/User'
import AgentLog from '@/models/AgentLog'

// Known top-level profile sections — anything else is ignored
const PROFILE_SECTIONS = ['income','expenses','savings','investments','insurance','liabilities','personal','tax']

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const userId = session.user.id ?? session.user.email!
    const profile = await FinancialProfile.findOne({ userId }).lean()
    return NextResponse.json({ profile: profile ?? null })
  } catch (err) {
    console.error('GET /api/profile:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    const body = await req.json()

    // Extract control flags — never written to DB
    const triggerRerun = Boolean(body.triggerRerun)

    await connectDB()
    const existing = await FinancialProfile.findOne({ userId })

    // Build flat $set only from known profile sections
    const flatSet: Record<string, unknown> = {}
    let hasUpdates = false

    for (const section of PROFILE_SECTIONS) {
      const sectionData = body[section]
      if (sectionData && typeof sectionData === 'object' && !Array.isArray(sectionData)) {
        for (const [key, val] of Object.entries(sectionData as Record<string, unknown>)) {
          if (val !== undefined && val !== null) {
            flatSet[`${section}.${key}`] = val
            hasUpdates = true
          }
        }
      }
    }

    let profile = existing
   if (hasUpdates) {
      if (existing) {
        profile = await FinancialProfile.findOneAndUpdate(
          { userId },
          { $set: flatSet, $inc: { version: 1 } },
          { new: true }
        )} else {
        // Build nested object for create
        const createData: Record<string, unknown> = { userId }
        for (const section of PROFILE_SECTIONS) {
          if (body[section]) createData[section] = body[section]
        }
        profile = await FinancialProfile.create(createData)
      }
    }

    // Optional agent re-run
    let rerunResult = null
    if (triggerRerun && profile) {
      try {
        const { orchestrate } = await import('@/agents/orchestrator')
        const profileObj = (profile.toObject ? profile.toObject() : profile) as unknown as Record<string,unknown>
        const input = buildAgentInput(profileObj as Record<string,unknown>)

        rerunResult = await orchestrate({
          taskType: 'money_health',
          userId,
          userInput: input,
        })

        if (rerunResult?.impactDashboard) {
          await FinancialProfile.findOneAndUpdate(
            { userId },
            {
              $set: {
                'latestAnalysis.healthScore':         rerunResult.impactDashboard.retirementReadiness ?? 0,
                'latestAnalysis.retirementReadiness': rerunResult.impactDashboard.retirementReadiness ?? 0,
                'latestAnalysis.taxSaved':            rerunResult.impactDashboard.taxSaved ?? 0,
                'latestAnalysis.netWorth':
                  ((profileObj.investments as Record<string,number>)?.total ?? 0) -
                  ((profileObj.liabilities as Record<string,number>)?.totalDebt ?? 0),
                'latestAnalysis.updatedAt': new Date().toISOString(),
              },
            }
          )
          profile = await FinancialProfile.findOne({ userId })
        }
      } catch (agentErr) {
        // Non-critical — return profile even if re-run fails
        console.error('Agent rerun failed:', agentErr)
      }
    }

    return NextResponse.json({ profile, rerunResult })
  } catch (err) {
    console.error('PUT /api/profile:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    await connectDB()

    await Promise.all([
      FinancialProfile.deleteMany({ userId }),
      User.deleteOne({ email: session.user.email }),
      AgentLog.deleteMany({ userId }),
    ])

    console.log(`[GDPR DELETE] userId=${userId} at ${new Date().toISOString()}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/profile:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

function buildAgentInput(profile: Record<string, unknown>) {
  const income      = (profile.income      as Record<string,number>) ?? {}
  const expenses    = (profile.expenses    as Record<string,number>) ?? {}
  const savings     = (profile.savings     as Record<string,number>) ?? {}
  const investments = (profile.investments as Record<string,number>) ?? {}
  const insurance   = (profile.insurance   as Record<string,unknown>) ?? {}
  const liabilities = (profile.liabilities as Record<string,number>) ?? {}
  const personal    = (profile.personal    as Record<string,unknown>) ?? {}
  const tax         = (profile.tax         as Record<string,number>) ?? {}

  return {
    monthlyIncome:       income.monthly      ?? 0,
    monthlyExpenses:     expenses.monthly    ?? 0,
    savings:             savings.total       ?? 0,
    age:                 Number(personal.age ?? 30),
    hasEmergencyFund:    (savings.emergencyMonths ?? 0) > 0,
    emergencyFundMonths: savings.emergencyMonths ?? 0,
    hasTermInsurance:    Boolean(insurance.hasTermInsurance),
    hasHealthInsurance:  Boolean(insurance.hasHealthInsurance),
    healthCoverAmount:   (insurance as Record<string,number>).healthCover ?? 0,
    totalDebt:           liabilities.totalDebt ?? 0,
    monthlyEMI:          expenses.emi         ?? 0,
    investmentAmount:    (investments.total   ?? 0) / 12,
    investmentTypes:     ['Mutual Funds', 'SIP'],
    hasPPF:              (investments.ppf     ?? 0) > 0,
    hasNPS:              (investments.nps     ?? 0) > 0,
    section80CInvested:  tax.section80C       ?? 0,
    hasRetirementPlan:   Number(personal.retirementAge ?? 60) < 60,
  }
}