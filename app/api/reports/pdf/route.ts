import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Report from '@/models/Report'
import { formatCurrency } from '@/tools/financialTools'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    const reportId = req.nextUrl.searchParams.get('reportId')

    await connectDB()

    let reportData: Record<string, unknown> | null = null
    if (reportId) {
      const report = await Report.findOne({ reportId, userId, deletedAt: { $exists: false } }).lean()
      if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
      reportData = report as unknown as Record<string, unknown>
    }

    // Return report data as JSON — client will generate PDF using jsPDF
    return NextResponse.json({
      reportData,
      userName: session.user.name ?? 'User',
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}