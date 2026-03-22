import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getGamification, updateGamification } from '@/lib/gamification'
import FinancialProfile from '@/models/FinancialProfile'
import Goal from '@/models/Goal'
import Report from '@/models/Report'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    await connectDB()

    const gamification = await getGamification(userId)
    return NextResponse.json({ gamification })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Called after any significant action (report generated, goal completed, etc.)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    await connectDB()

    const [profile, goals, reports] = await Promise.all([
      FinancialProfile.findOne({ userId }).lean(),
      Goal.find({ userId }).lean(),
      Report.countDocuments({ userId, deletedAt: { $exists: false } }),
    ])

    const stats = {
      healthScore:       profile?.latestAnalysis?.healthScore ?? 0,
      reportsGenerated:  reports,
      goalsCreated:      goals.length,
      goalsCompleted:    goals.filter(g => g.completed).length,
      daysActive:        1,
      investmentAmount:  (profile?.investments?.total ?? 0) / 12,
      has80CMaxed:       (profile?.tax?.section80C ?? 0) >= 150000,
      hasTermInsurance:  profile?.insurance?.hasTermInsurance ?? false,
      hasEmergencyFund:  (profile?.savings?.emergencyMonths ?? 0) >= 6,
      savingsStreak:     0, // updated inside updateGamification
    }

    const result = await updateGamification(userId, stats)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}