import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Alert from '@/models/Alert'
import FinancialProfile from '@/models/FinancialProfile'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    await connectDB()

    // Auto-generate smart alerts from profile
    const profile = await FinancialProfile.findOne({ userId }).lean()
    if (profile) {
      await generateSmartAlerts(userId, profile)
    }

    const alerts = await Alert.find({ userId, dismissed: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    return NextResponse.json({ alerts })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    const { alertId, action } = await req.json()

    await connectDB()
    await Alert.findOneAndUpdate(
      { _id: alertId, userId },
      action === 'dismiss' ? { dismissed: true } : { read: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

async function generateSmartAlerts(userId: string, profile: Record<string, unknown>) {
  const p = profile as {
    income?: { monthly?: number }
    expenses?: { monthly?: number; emi?: number }
    savings?: { emergencyMonths?: number }
    insurance?: { hasTermInsurance?: boolean; hasHealthInsurance?: boolean }
    investments?: { total?: number }
    tax?: { section80C?: number }
    liabilities?: { totalDebt?: number }
    personal?: { age?: number; retirementAge?: number }
  }

  const income   = p.income?.monthly ?? 0
  const expenses = p.expenses?.monthly ?? 0
  const emi      = p.expenses?.emi ?? 0
  const savings  = p.savings?.emergencyMonths ?? 0
  const section80C = p.tax?.section80C ?? 0
  const age      = p.personal?.age ?? 30

  const alerts: Array<{ message: string; severity: 'critical'|'warning'|'info'; category: string }> = []

  if (!p.insurance?.hasTermInsurance && income > 0) {
    alerts.push({ message: 'You have no term life insurance. Your family is financially unprotected.', severity: 'critical', category: 'insurance' })
  }
  if (savings < 3) {
    alerts.push({ message: `Emergency fund is only ${savings} months. Build it to 6 months immediately.`, severity: 'critical', category: 'emergency' })
  }
  if (emi / Math.max(1, income) > 0.5) {
    alerts.push({ message: `Your EMI is ${Math.round(emi/income*100)}% of income — dangerously high. Consider loan restructuring.`, severity: 'critical', category: 'debt' })
  }
  if (section80C < 100000 && income > 30000) {
    alerts.push({ message: `You've only used ₹${section80C.toLocaleString('en-IN')} of ₹1,50,000 80C limit. Invest before March 31.`, severity: 'warning', category: 'tax' })
  }
  if ((p.investments?.total ?? 0) / 12 < income * 0.1) {
    alerts.push({ message: 'You are investing less than 10% of your income. Consider increasing your SIP amount.', severity: 'warning', category: 'investments' })
  }
  if (age > 50 && (p.investments?.total ?? 0) < 5000000) {
    alerts.push({ message: 'With retirement approaching, your corpus may be insufficient. Urgently review FIRE plan.', severity: 'warning', category: 'retirement' })
  }

  // Only insert alerts that don't exist in last 7 days
  for (const alert of alerts) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
    const exists = await Alert.findOne({
      userId,
      message: alert.message,
      createdAt: { $gte: sevenDaysAgo },
    })
    if (!exists) {
      await Alert.create({ userId, ...alert })
    }
  }
}