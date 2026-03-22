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

    // Generate HTML-based PDF content
    const html = generateReportHTML(reportData, session.user.name ?? 'User')

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'X-Report-Generated': new Date().toISOString(),
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

function generateReportHTML(report: Record<string, unknown> | null, userName: string): string {
  const now = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  const metrics = (report?.metrics as Record<string, number>) ?? {}
  const outputs = (report?.outputs as Record<string, unknown>) ?? {}
  const plan = (outputs?.plan as Record<string, unknown>) ?? {}
  const analysis = (outputs?.analysis as Record<string, unknown>) ?? {}

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Money Mentor Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; }
  .header { background: linear-gradient(135deg, #059669, #047857); color: white; padding: 40px; }
  .header h1 { font-size: 28px; font-weight: 800; margin-bottom: 4px; }
  .header p { opacity: 0.85; font-size: 14px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 12px; font-size: 12px; margin-top: 10px; }
  .section { padding: 32px 40px; border-bottom: 1px solid #f0f0f0; }
  .section h2 { font-size: 18px; font-weight: 700; color: #059669; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .metric-card { background: #f8fffe; border: 1px solid #d1fae5; border-radius: 12px; padding: 16px; text-align: center; }
  .metric-value { font-size: 24px; font-weight: 800; color: #059669; }
  .metric-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: #6b7280; }
  .info-value { font-weight: 600; }
  .action-item { display: flex; gap: 12px; padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px; }
  .priority-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; height: fit-content; white-space: nowrap; }
  .priority-high { background: #fee2e2; color: #dc2626; }
  .priority-medium { background: #fef3c7; color: #d97706; }
  .priority-low { background: #d1fae5; color: #059669; }
  .insight { padding: 10px 14px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 0 8px 8px 0; margin-bottom: 8px; font-size: 13px; }
  .disclaimer { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; font-size: 12px; color: #92400e; margin-top: 16px; }
  .regime-box { border: 2px solid #d1fae5; border-radius: 12px; padding: 20px; }
  .regime-box.recommended { border-color: #059669; background: #f0fdf4; }
  .regime-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
  .regime-value { font-size: 22px; font-weight: 800; }
  .footer { padding: 24px 40px; background: #f9fafb; font-size: 12px; color: #6b7280; display: flex; justify-content: space-between; }
  .improvement { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
  .delta-positive { color: #059669; font-weight: 700; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="header">
  <h1>💰 AI Money Mentor Report</h1>
  <p>Prepared for ${userName} &nbsp;·&nbsp; Generated on ${now}</p>
  <div class="badge">🤖 7-Agent Autonomous Analysis · SEBI Educational Disclaimer Applies</div>
</div>

${metrics.healthScore || metrics.retirementReadiness || metrics.taxSaved || metrics.xirr ? `
<div class="section">
  <h2>📊 Impact Summary</h2>
  <div class="grid-4">
    ${metrics.healthScore ? `<div class="metric-card"><div class="metric-value">${metrics.healthScore}/100</div><div class="metric-label">Health Score</div></div>` : ''}
    ${metrics.retirementReadiness ? `<div class="metric-card"><div class="metric-value">${metrics.retirementReadiness}%</div><div class="metric-label">Retirement Readiness</div></div>` : ''}
    ${metrics.taxSaved ? `<div class="metric-card"><div class="metric-value">${formatCurrency(metrics.taxSaved)}</div><div class="metric-label">Tax Saved</div></div>` : ''}
    ${metrics.xirr ? `<div class="metric-card"><div class="metric-value">${metrics.xirr}%</div><div class="metric-label">Portfolio XIRR</div></div>` : ''}
  </div>
</div>` : ''}

${(plan as Record<string, unknown>)?.strategy ? `
<div class="section">
  <h2>🎯 AI Strategy Summary</h2>
  <p style="font-size:14px;line-height:1.7;color:#374151">${(plan as Record<string, unknown>).strategy}</p>
</div>` : ''}

${(plan as Record<string, unknown>)?.sipPlan ? `
<div class="section">
  <h2>📈 Recommended SIP Plan</h2>
  ${((plan as Record<string, unknown>).sipPlan as Array<Record<string, unknown>>).map(s => `
    <div class="info-row">
      <span class="info-label">${s.instrument} <span style="color:#9ca3af;font-size:12px">(${s.category})</span></span>
      <span class="info-value" style="color:#059669">${formatCurrency(Number(s.amount))}/mo</span>
    </div>
  `).join('')}
</div>` : ''}

${(analysis as Record<string, unknown>)?.taxResult ? `
<div class="section">
  <h2>🧾 Tax Analysis</h2>
  <div class="grid-2">
    <div class="regime-box ${(analysis as Record<string, unknown>).taxResult && ((analysis as Record<string, unknown>).taxResult as Record<string, unknown>).recommendation === 'old' ? 'recommended' : ''}">
      <div class="regime-label">Old Regime ${(analysis as Record<string, unknown>).taxResult && ((analysis as Record<string, unknown>).taxResult as Record<string, unknown>).recommendation === 'old' ? '✓ Recommended' : ''}</div>
      <div class="regime-value">₹${(((analysis as Record<string, unknown>).taxResult as Record<string, unknown>)?.oldRegime as Record<string, unknown>)?.tax?.toLocaleString('en-IN') ?? '—'}</div>
    </div>
    <div class="regime-box ${(analysis as Record<string, unknown>).taxResult && ((analysis as Record<string, unknown>).taxResult as Record<string, unknown>).recommendation === 'new' ? 'recommended' : ''}">
      <div class="regime-label">New Regime ${(analysis as Record<string, unknown>).taxResult && ((analysis as Record<string, unknown>).taxResult as Record<string, unknown>).recommendation === 'new' ? '✓ Recommended' : ''}</div>
      <div class="regime-value">₹${(((analysis as Record<string, unknown>).taxResult as Record<string, unknown>)?.newRegime as Record<string, unknown>)?.tax?.toLocaleString('en-IN') ?? '—'}</div>
    </div>
  </div>
</div>` : ''}

${(plan as Record<string, unknown>)?.actionItems ? `
<div class="section">
  <h2>⚡ Action Plan</h2>
  ${((plan as Record<string, unknown>).actionItems as Array<Record<string, unknown>>).map(a => `
    <div class="action-item">
      <span class="priority-badge priority-${a.priority}">${String(a.priority).toUpperCase()}</span>
      <div>
        <div style="font-size:14px;font-weight:500">${a.action}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">${a.timeline}</div>
      </div>
    </div>
  `).join('')}
</div>` : ''}

${(plan as Record<string, unknown>)?.insights ? `
<div class="section">
  <h2>💡 Key Insights</h2>
  ${((plan as Record<string, unknown>).insights as string[]).map((ins, i) => `
    <div class="insight"><strong>${i + 1}.</strong> ${ins}</div>
  `).join('')}
</div>` : ''}

${(plan as Record<string, unknown>)?.explainability ? `
<div class="section">
  <h2>🔍 Why This Recommendation?</h2>
  <p style="font-size:13px;line-height:1.7;color:#374151">${(plan as Record<string, unknown>).explainability}</p>
  <div class="disclaimer">
    ⚠️ <strong>SEBI Disclaimer:</strong> This report is generated by AI for educational purposes only. 
    It does not constitute SEBI-registered investment advice. Please consult a qualified financial advisor 
    before making investment decisions.
  </div>
</div>` : ''}

<div class="footer">
  <span>AI Money Mentor · Multi-Agent Financial Analysis System</span>
  <span>Report ID: ${(report?.reportId as string) ?? 'N/A'} · v${(report?.profileVersion as number) ?? 1}</span>
</div>

</body>
</html>`
}
