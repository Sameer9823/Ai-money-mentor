import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Report from '@/models/Report'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id ?? session.user.email!
    const reportId = req.nextUrl.searchParams.get('reportId')

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 })
    }

    await connectDB()

    const report = await Report.findOne({ reportId, userId }).lean()

    if (!report) {
      return NextResponse.json({ error: `Report ${reportId} not found` }, { status: 404 })
    }

    // Safely serialize — removes Mongoose internals
    const reportData = JSON.parse(JSON.stringify(report))

    return NextResponse.json({
      reportData,
      userName: session.user.name ?? session.user.email ?? 'User',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[PDF API] Error:', message)
    // Always return JSON, never let Next.js return an HTML error page
    return NextResponse.json({ error: message }, { status: 500 })
  }
}