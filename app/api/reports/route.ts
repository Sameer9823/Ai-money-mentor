import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Report from '@/models/Report'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    await connectDB()

    const reports = await Report.find({ userId, deletedAt: { $exists: false } })
      .select('reportId type title metrics createdAt profileVersion pdfGenerated')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({ reports })
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

    await connectDB()

    const report = await Report.create({
      reportId: randomUUID(),
      userId,
      profileVersion: body.profileVersion ?? 1,
      type: body.type,
      title: body.title ?? `${body.type.replace(/_/g, ' ')} Report`,
      inputs: body.inputs ?? {},
      outputs: body.outputs ?? {},
      agentLogs: body.agentLogs ?? [],
      metrics: body.metrics ?? {},
      comparison: body.comparison,
      pdfGenerated: false,
    })

    return NextResponse.json({ report }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
