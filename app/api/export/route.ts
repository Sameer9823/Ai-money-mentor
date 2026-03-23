import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import FinancialProfile from '@/models/FinancialProfile'
import Goal from '@/models/Goal'
import Report from '@/models/Report'
import Timeline from '@/models/Timeline'
import Alert from '@/models/Alert'
import Gamification from '@/models/Gamification'

// Escape CSV cell values
function csvCell(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s
}
function csvRow(...vals: unknown[]): string {
  return vals.map(csvCell).join(',')
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    const format = req.nextUrl.searchParams.get('format') ?? 'json'

    await connectDB()

    const [profile, goals, reports, timeline, gamification] = await Promise.all([
      FinancialProfile.findOne({ userId }).lean(),
      Goal.find({ userId }).sort({ createdAt: -1 }).lean(),
      Report.find({ userId })
        .select('reportId type title createdAt metrics profileVersion')
        .sort({ createdAt: -1 })
        .lean(),
      Timeline.find({ userId }).sort({ createdAt: -1 }).limit(100).lean(),
      Gamification.findOne({ userId }).lean(),
    ])

    if (format === 'csv') {
      const rows: string[] = []

      // ── User Info ─────────────────────────────────────────────────
      rows.push('=== USER INFO ===')
      rows.push(csvRow('Email', session.user.email ?? ''))
      rows.push(csvRow('Name', session.user.name ?? ''))
      rows.push(csvRow('Exported At', new Date().toISOString()))
      rows.push('')

      // ── Financial Profile ─────────────────────────────────────────
      rows.push('=== FINANCIAL PROFILE ===')
      rows.push(csvRow('Field', 'Value'))
      if (profile) {
        rows.push(csvRow('Monthly Income', profile.income?.monthly ?? 0))
        rows.push(csvRow('Annual Income', profile.income?.annual ?? 0))
        rows.push(csvRow('Monthly Expenses', profile.expenses?.monthly ?? 0))
        rows.push(csvRow('Monthly EMI', profile.expenses?.emi ?? 0))
        rows.push(csvRow('Total Savings', profile.savings?.total ?? 0))
        rows.push(csvRow('Emergency Fund Months', profile.savings?.emergencyMonths ?? 0))
        rows.push(csvRow('Total Investments', profile.investments?.total ?? 0))
        rows.push(csvRow('Equity Investments', profile.investments?.equity ?? 0))
        rows.push(csvRow('Debt Investments', profile.investments?.debt ?? 0))
        rows.push(csvRow('Total Debt', profile.liabilities?.totalDebt ?? 0))
        rows.push(csvRow('Home Loan', profile.liabilities?.homeLoan ?? 0))
        rows.push(csvRow('Has Term Insurance', profile.insurance?.hasTermInsurance ? 'Yes' : 'No'))
        rows.push(csvRow('Has Health Insurance', profile.insurance?.hasHealthInsurance ? 'Yes' : 'No'))
        rows.push(csvRow('Health Cover', profile.insurance?.healthCover ?? 0))
        rows.push(csvRow('Age', profile.personal?.age ?? 0))
        rows.push(csvRow('City', profile.personal?.city ?? ''))
        rows.push(csvRow('Risk Profile', profile.personal?.riskProfile ?? ''))
        rows.push(csvRow('Retirement Age', profile.personal?.retirementAge ?? 60))
        rows.push(csvRow('Section 80C', profile.tax?.section80C ?? 0))
        rows.push(csvRow('Health Score', profile.latestAnalysis?.healthScore ?? 0))
        rows.push(csvRow('Retirement Readiness', profile.latestAnalysis?.retirementReadiness ?? 0))
        rows.push(csvRow('Tax Saved', profile.latestAnalysis?.taxSaved ?? 0))
        const netWorth = (profile.investments?.total ?? 0) + (profile.savings?.total ?? 0) - (profile.liabilities?.totalDebt ?? 0)
        rows.push(csvRow('Net Worth', netWorth))
      } else {
        rows.push(csvRow('No profile data found', ''))
      }
      rows.push('')

      // ── Goals ─────────────────────────────────────────────────────
      rows.push('=== GOALS ===')
      rows.push(csvRow('Name', 'Target Amount', 'Current Amount', 'Progress %', 'Category', 'Priority', 'Target Date', 'Completed'))
      for (const g of goals) {
        rows.push(csvRow(g.name, g.targetAmount, g.currentAmount, g.progress, g.category, g.priority, g.targetDate, g.completed ? 'Yes' : 'No'))
      }
      if (goals.length === 0) rows.push(csvRow('No goals found'))
      rows.push('')

      // ── Reports ───────────────────────────────────────────────────
      rows.push('=== REPORTS ===')
      rows.push(csvRow('Report ID', 'Type', 'Title', 'Date', 'Health Score', 'Tax Saved'))
      for (const r of reports) {
        rows.push(csvRow(r.reportId, r.type, r.title, new Date(r.createdAt).toLocaleDateString('en-IN'), r.metrics?.healthScore ?? '', r.metrics?.taxSaved ?? ''))
      }
      if (reports.length === 0) rows.push(csvRow('No reports found'))
      rows.push('')

      // ── Timeline ──────────────────────────────────────────────────
      rows.push('=== FINANCIAL TIMELINE ===')
      rows.push(csvRow('Date', 'Action', 'Category', 'Impact', 'Status'))
      for (const t of timeline) {
        rows.push(csvRow(new Date(t.createdAt).toLocaleDateString('en-IN'), t.recommendation, t.category, t.impact, t.status))
      }
      if (timeline.length === 0) rows.push(csvRow('No timeline entries found'))
      rows.push('')

      // ── Gamification ─────────────────────────────────────────────
      rows.push('=== GAMIFICATION ===')
      if (gamification) {
        rows.push(csvRow('Level', gamification.level))
        rows.push(csvRow('Level Name', gamification.levelName))
        rows.push(csvRow('Total Points', gamification.totalPoints))
        rows.push(csvRow('Savings Streak', gamification.savingsStreak))
        rows.push(csvRow('Badges Earned', gamification.badges?.length ?? 0))
      } else {
        rows.push(csvRow('No gamification data found'))
      }

      const csv = rows.join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="money-mentor-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // ── JSON export ───────────────────────────────────────────────────
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: { email: session.user.email, name: session.user.name },
      profile: profile ? JSON.parse(JSON.stringify(profile)) : null,
      goals: JSON.parse(JSON.stringify(goals)),
      reports: JSON.parse(JSON.stringify(reports)),
      timeline: JSON.parse(JSON.stringify(timeline)),
      gamification: gamification ? JSON.parse(JSON.stringify(gamification)) : null,
      summary: {
        totalGoals: goals.length,
        totalReports: reports.length,
        timelineEntries: timeline.length,
        healthScore: profile?.latestAnalysis?.healthScore ?? 0,
        netWorth: (profile?.investments?.total ?? 0) + (profile?.savings?.total ?? 0) - (profile?.liabilities?.totalDebt ?? 0),
      },
    }

    const json = JSON.stringify(exportData, null, 2)
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="money-mentor-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Export API]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}