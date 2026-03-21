import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Goal from '@/models/Goal'
import { calculateRequiredSIP } from '@/tools/financialTools'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    const body = await req.json()

    // Recalculate SIP and progress
    if (body.targetAmount && body.targetDate) {
      const yearsLeft = Math.max(0.5,
        (new Date(body.targetDate).getTime() - Date.now()) / (365.25 * 24 * 3600 * 1000)
      )
      const remaining = Math.max(0, body.targetAmount - (body.currentAmount ?? 0))
      body.monthlySIPRequired = remaining > 0
        ? Math.round(calculateRequiredSIP(remaining, 12, yearsLeft))
        : 0
      body.progress = Math.min(100, Math.round(((body.currentAmount ?? 0) / body.targetAmount) * 100))
      body.completed = body.progress >= 100
    }

    await connectDB()
    const goal = await Goal.findOneAndUpdate(
      { _id: params.id, userId },
      body,
      { new: true }
    )

    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    return NextResponse.json({ goal })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    await connectDB()
    const result = await Goal.deleteOne({ _id: params.id, userId })

    if (result.deletedCount === 0) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
