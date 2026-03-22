import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import FinancialProfile from '@/models/FinancialProfile'
import Goal from '@/models/Goal'
import Report from '@/models/Report'
import Timeline from '@/models/Timeline'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    const format = req.nextUrl.searchParams.get('format') ?? 'json'

    await connectDB()

    const [profile, goals, reports, timeline] = await Promise.all([
      FinancialProfile.findOne({ userId }).lean(),
      Goal.find({ userId }).lean(),
      Report.find({ userId, deletedAt: { $exists: false } })
        .select('reportId type title createdAt metrics').lean(),
      Timeline.find({ userId }).sort({ createdAt: -1 }).limit(100).lean(),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: { email: session.user.email, name: session.user.name },
      profile,
      goals,
      reports,
      timeline,
    }

    if (format === 'csv') {
      // Flatten profile to CSV
      const rows: string[] = ['Field,Value']

      if (profile) {
        rows.push(`Monthly Income,${profile.income?.monthly ?? 0}`)
        rows.push(`Monthly Expenses,${profile.expenses?.monthly ?? 0}`)
        rows.push(`Total Savings,${profile.savings?.total ?? 0}`)
        rows.push(`Total Investments,${profile.investments?.total ?? 0}`)
        rows.push(`Total Debt,${profile.liabilities?.totalDebt ?? 0}`)
        rows.push(`Age,${profile.personal?.age ?? 0}`)
        rows.push(`Risk Profile,${profile.personal?.riskProfile ?? ''}`)
        rows.push(`Health Score,${profile.latestAnalysis?.healthScore ?? 0}`)
        rows.push(`Net Worth,${(profile.investments?.total ?? 0) + (profile.savings?.total ?? 0) - (profile.liabilities?.totalDebt ?? 0)}`)
      }

      rows.push('')
      rows.push('Goals')
      rows.push('Name,Target,Current,Progress,Category')
      for (const g of goals) {
        rows.push(`${g.name},${g.targetAmount},${g.currentAmount},${g.progress}%,${g.category}`)
      }

      const csv = rows.join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="money-mentor-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // JSON export
    const json = JSON.stringify(exportData, null, 2)
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="money-mentor-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}