import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Report from '@/models/Report'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    await connectDB()

    const report = await Report.findOne({
      reportId: params.id,
      userId,
      deletedAt: { $exists: false },
    }).lean()

    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    return NextResponse.json({ report })
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

    // Soft delete — preserve for audit trail
    const result = await Report.findOneAndUpdate(
      { reportId: params.id, userId },
      { deletedAt: new Date() },
      { new: true }
    )

    if (!result) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    console.log(`[REPORT DELETE] reportId=${params.id} userId=${userId} at ${new Date().toISOString()}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
