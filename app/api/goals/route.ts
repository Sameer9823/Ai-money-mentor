import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Goal from '@/models/Goal'
import { calculateRequiredSIP } from '@/tools/financialTools'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    await connectDB()
    const goals = await Goal.find({ userId }).sort({ priority: 1, createdAt: -1 }).lean()

    return NextResponse.json({ goals })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    const body = await req.json()

    // Auto-calculate monthly SIP required
    const targetDate = new Date(body.targetDate)
    const now = new Date()
    const yearsLeft = Math.max(0.5, (targetDate.getTime() - now.getTime()) / (365.25 * 24 * 3600 * 1000))
    const remaining = Math.max(0, (body.targetAmount ?? 0) - (body.currentAmount ?? 0))
    const monthlySIPRequired = remaining > 0
      ? Math.round(calculateRequiredSIP(remaining, 12, yearsLeft))
      : 0

    await connectDB()
    const goal = await Goal.create({
      userId,
      ...body,
      monthlySIPRequired,
      progress: body.targetAmount > 0
        ? Math.min(100, Math.round(((body.currentAmount ?? 0) / body.targetAmount) * 100))
        : 0,
    })

    return NextResponse.json({ goal }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
