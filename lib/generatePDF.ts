'use client'

function s(v: unknown): string { return v ? String(v) : '' }
function n(v: unknown): number { const x = Number(v); return isNaN(x) || !isFinite(x) ? 0 : x }
function arr(v: unknown): Record<string, unknown>[] { return Array.isArray(v) ? v as Record<string, unknown>[] : [] }
function sarr(v: unknown): string[] { return Array.isArray(v) ? v as string[] : [] }
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
}

function inr(amount: unknown): string {
  const x = n(amount)
  if (!x) return '—'
  if (x >= 10000000) return '₹' + (x / 10000000).toFixed(2) + ' Cr'
  if (x >= 100000)   return '₹' + (x / 100000).toFixed(2) + ' L'
  return '₹' + Math.round(x).toLocaleString('en-IN')
}

function pct(v: unknown): string {
  const x = n(v)
  return x ? x.toFixed(1) + '%' : '—'
}

export async function generateAndDownloadPDF(rawReport: unknown, userName: string): Promise<void> {
  const report  = obj(rawReport)
  const outputs = obj(report.outputs)
  const plan    = obj(outputs.plan)
  const analysis = obj(outputs.analysis)
  const impact  = obj(outputs.impactDashboard)
  const metrics = obj(report.metrics)

  const strategy        = s(plan.strategy)
  const explainability  = s(plan.explainability)
  const sipPlan         = arr(plan.sipPlan)
  const actionItems     = arr(plan.actionItems)
  const insights        = sarr(plan.insights)
  const taxSuggestions  = sarr(plan.taxSuggestions)
  const missedDeducts   = arr(plan.missedDeductions)
  const rebalancePlan   = arr(plan.rebalancingPlan)
  const assetAlloc      = obj(plan.assetAllocation)
  const taxResult       = obj(analysis.taxResult)
  const oldRegime       = obj(taxResult.oldRegime)
  const newRegime       = obj(taxResult.newRegime)
  const fireM           = obj(analysis.fireMetrics)
  const portM           = obj(analysis.portfolioMetrics)

  const taxSaved    = n(impact.taxSaved) || n(metrics.taxSaved)
  const retReady    = n(impact.retirementReadiness) || n(metrics.retirementReadiness)
  const healthScore = n(metrics.healthScore)
  const xirr        = n(metrics.xirr) || n(portM.xirr)
  const taxRec      = s(taxResult.recommendation) || 'new'
  const taxSavings  = n(taxResult.savings)
  const oldTax      = n(oldRegime.tax)
  const newTax      = n(newRegime.tax)

  const now = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  const allocEntries = Object.entries(assetAlloc).filter(([, v]) => n(v) > 0)
  const barColors = ['#059669', '#2563eb', '#d97706', '#6b7280', '#7c3aed']
  const priBg: Record<string, string>  = { high: '#fff1f2', medium: '#fffbeb', low: '#f0fdf4' }
  const priCol: Record<string, string> = { high: '#e11d48', medium: '#d97706', low: '#16a34a' }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Money Mentor — ${userName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#111827;font-size:12px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact;}

/* HEADER */
.hdr{background:linear-gradient(135deg,#059669,#047857);color:#fff;padding:28px 36px 20px;position:relative;}
.hdr h1{font-size:21px;font-weight:800;margin-bottom:3px;letter-spacing:-0.3px;}
.hdr .sub{font-size:12px;opacity:.85;}
.hdr .meta{font-size:10px;opacity:.6;margin-top:6px;}

/* IMPACT ROW */
.impact-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:16px 36px;background:#f8fafc;border-bottom:1px solid #e2e8f0;}
.ic{background:#fff;border-radius:8px;padding:12px 14px;border-left:4px solid #059669;box-shadow:0 1px 3px rgba(0,0,0,.06);}
.ic.blue{border-left-color:#2563eb;}.ic.amber{border-left-color:#d97706;}
.iv{font-size:17px;font-weight:800;color:#059669;line-height:1.1;}
.ic.blue .iv{color:#2563eb;}.ic.amber .iv{color:#d97706;}
.il{font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-top:3px;font-weight:600;}

/* CONTENT */
.content{padding:4px 36px 36px;}

/* SECTION */
.section{margin-top:22px;page-break-inside:avoid;}
.st{font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.7px;padding-bottom:6px;border-bottom:2px solid #d1fae5;margin-bottom:12px;display:flex;align-items:center;gap:6px;}
.st::before{content:'';display:inline-block;width:4px;height:14px;background:#059669;border-radius:2px;flex-shrink:0;}

/* TEXT BLOCK */
.tb{background:#f0fdf4;border-left:3px solid #059669;border-radius:0 6px 6px 0;padding:10px 14px;font-size:12px;line-height:1.65;color:#374151;}
.tb.blue{background:#eff6ff;border-left-color:#2563eb;}

/* CARDS */
.card-list{display:flex;flex-direction:column;gap:8px;}
.card{display:flex;align-items:stretch;border-radius:7px;overflow:hidden;background:#f8fafc;}
.card-accent{width:4px;flex-shrink:0;}
.card-body{flex:1;padding:10px 12px;}
.card-right{padding:10px 12px;text-align:right;flex-shrink:0;display:flex;flex-direction:column;justify-content:center;}
.card-title{font-size:12px;font-weight:600;color:#111827;margin-bottom:2px;}
.card-sub{font-size:10.5px;color:#6b7280;line-height:1.45;}
.card-amount{font-size:13px;font-weight:800;color:#059669;white-space:nowrap;}
.card-label{font-size:9px;color:#9ca3af;margin-top:1px;}

/* BADGE */
.badge{display:inline-block;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;}

/* TAX */
.tax-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;}
.tax-card{border-radius:8px;padding:14px 16px;border:1.5px solid #e5e7eb;background:#f9fafb;position:relative;}
.tax-card.rec{background:#f0fdf4;border-color:#059669;border-width:2px;}
.tax-label{font-size:9px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:.5px;margin-bottom:4px;}
.tax-amount{font-size:22px;font-weight:800;color:#111827;margin-bottom:6px;}
.tax-card.rec .tax-amount{color:#059669;}
.tax-detail{font-size:10px;color:#6b7280;margin-bottom:2px;}
.rec-badge{position:absolute;top:10px;right:10px;background:#059669;color:#fff;font-size:8px;font-weight:700;padding:2px 7px;border-radius:10px;}
.sav-banner{background:#d1fae5;border-radius:7px;padding:10px 14px;text-align:center;font-size:13px;font-weight:700;color:#065f46;}

/* ACTION ITEMS */
.action{display:flex;gap:10px;padding:10px 12px;border-radius:7px;align-items:flex-start;margin-bottom:7px;page-break-inside:avoid;}
.action-text .main{font-size:12px;font-weight:600;color:#111827;margin-bottom:2px;}
.action-text .time{font-size:10px;color:#9ca3af;}

/* NUMBERED */
.nlist{display:flex;flex-direction:column;gap:7px;}
.ni{display:flex;gap:10px;padding:9px 12px;background:#f8fafc;border-radius:7px;align-items:flex-start;}
.nc{width:20px;height:20px;border-radius:50%;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;background:#059669;}
.nc.blue{background:#2563eb;}
.nt{font-size:11.5px;color:#374151;line-height:1.55;flex:1;}

/* ALLOC BAR */
.alloc-bar{height:24px;border-radius:5px;overflow:hidden;display:flex;margin-bottom:8px;}
.aseg{display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;}
.aleg{display:flex;flex-wrap:wrap;gap:5px 16px;}
.ali{display:flex;align-items:center;gap:5px;font-size:11px;color:#374151;}
.adot{width:9px;height:9px;border-radius:2px;flex-shrink:0;}

/* TABLE */
.kvt{width:100%;border-collapse:collapse;}
.kvt tr{border-bottom:1px solid #f3f4f6;}
.kvt td{padding:7px 3px;font-size:11.5px;}
.kvt td:first-child{color:#6b7280;font-weight:500;}
.kvt td:last-child{font-weight:700;text-align:right;}
.green{color:#059669;}.amber{color:#d97706;}.red{color:#dc2626;}

/* FIRE GRID */
.fire-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
.fc{background:#f8fafc;border-radius:7px;padding:12px 14px;border-left:3px solid #059669;}
.fc.blue{border-left-color:#2563eb;}.fc.amber{border-left-color:#d97706;}
.fv{font-size:15px;font-weight:800;color:#059669;}
.fc.blue .fv{color:#2563eb;}.fc.amber .fv{color:#d97706;}
.fl{font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:600;margin-top:3px;letter-spacing:.3px;}

/* DISCLAIMER */
.disc{margin-top:22px;background:#fffbeb;border:1.5px solid #fcd34d;border-radius:8px;padding:13px 16px;}
.disc-title{font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px;}
.disc p{font-size:10.5px;color:#78350f;line-height:1.65;}

/* FOOTER */
.footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:9.5px;color:#9ca3af;}

/* PRINT BUTTON */
.print-btn{position:fixed;top:12px;right:12px;background:#059669;color:#fff;border:none;padding:9px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;z-index:999;box-shadow:0 4px 12px rgba(5,150,105,.35);font-family:inherit;}
.print-btn:hover{background:#047857;}

@media print{
  .print-btn{display:none!important;}
  body{font-size:11px;}
  .section{page-break-inside:avoid;}
  .card,.action,.ni,.tax-card{page-break-inside:avoid;}
  @page{margin:12mm 10mm;size:A4;}
}
</style>
</head>
<body>

<button class="print-btn" onclick="window.print()">⬇ Save as PDF</button>

<div class="hdr">
  <div style="font-size:26px;margin-bottom:8px">💰</div>
  <h1>AI Money Mentor Report</h1>
  <div class="sub">Prepared for <strong>${userName}</strong></div>
  <div class="sub">Generated on ${now}</div>
  <div class="meta">Report ID: ${s(report.reportId) || 'N/A'} &nbsp;·&nbsp; Profile v${n(report.profileVersion) || 1} &nbsp;·&nbsp; 7-Agent Autonomous Analysis</div>
</div>

<div class="impact-row">
  <div class="ic"><div class="iv">${healthScore ? healthScore + '/100' : 'N/A'}</div><div class="il">Health Score</div></div>
  <div class="ic blue"><div class="iv">${retReady ? retReady + '%' : 'N/A'}</div><div class="il">Retirement Ready</div></div>
  <div class="ic"><div class="iv">${taxSaved ? inr(taxSaved) : 'N/A'}</div><div class="il">Tax Saved</div></div>
  <div class="ic amber"><div class="iv">${xirr ? pct(xirr) : 'N/A'}</div><div class="il">Portfolio XIRR</div></div>
</div>

<div class="content">

${strategy ? `
<div class="section">
  <div class="st">Strategy Summary</div>
  <div class="tb">${strategy}</div>
</div>` : ''}

${(oldTax > 0 || newTax > 0) ? `
<div class="section">
  <div class="st">Tax Regime Comparison</div>
  <div class="tax-grid">
    <div class="tax-card ${taxRec === 'old' ? 'rec' : ''}">
      ${taxRec === 'old' ? '<span class="rec-badge">✓ RECOMMENDED</span>' : ''}
      <div class="tax-label">Old Tax Regime</div>
      <div class="tax-amount">${inr(oldTax)}</div>
      <div class="tax-detail">Taxable Income: ${inr(n(oldRegime.taxableIncome))}</div>
      <div class="tax-detail">Effective Rate: ${n(oldRegime.effectiveRate).toFixed(1)}%</div>
    </div>
    <div class="tax-card ${taxRec === 'new' ? 'rec' : ''}">
      ${taxRec === 'new' ? '<span class="rec-badge">✓ RECOMMENDED</span>' : ''}
      <div class="tax-label">New Tax Regime</div>
      <div class="tax-amount">${inr(newTax)}</div>
      <div class="tax-detail">Taxable Income: ${inr(n(newRegime.taxableIncome))}</div>
      <div class="tax-detail">Effective Rate: ${n(newRegime.effectiveRate).toFixed(1)}%</div>
    </div>
  </div>
  ${taxSavings > 0 ? `<div class="sav-banner">✓ You save ${inr(taxSavings)} by choosing the ${taxRec.toUpperCase()} Tax Regime</div>` : ''}
</div>` : ''}

${taxSuggestions.length > 0 ? `
<div class="section">
  <div class="st">Tax Saving Suggestions</div>
  <div class="nlist">
    ${taxSuggestions.map((tip, i) => `
    <div class="ni"><div class="nc">${i + 1}</div><div class="nt">${tip}</div></div>`).join('')}
  </div>
</div>` : ''}

${missedDeducts.length > 0 ? `
<div class="section">
  <div class="st">Missed Deductions</div>
  <div class="card-list">
    ${missedDeducts.map(d => `
    <div class="card">
      <div class="card-accent" style="background:#d97706"></div>
      <div class="card-body">
        <div class="card-title">${s(d.section)}</div>
        <div class="card-sub">${s(d.description)}${n(d.limit) > 0 ? ' &nbsp;·&nbsp; Max: ' + inr(n(d.limit)) : ''}</div>
      </div>
      <div class="card-right">
        <div class="card-amount" style="color:#059669">${inr(n(d.saving))}</div>
        <div class="card-label">potential saving</div>
      </div>
    </div>`).join('')}
  </div>
</div>` : ''}

${sipPlan.length > 0 ? `
<div class="section">
  <div class="st">Recommended SIP Plan</div>
  <div class="card-list">
    ${sipPlan.map(sp => `
    <div class="card">
      <div class="card-accent" style="background:#059669"></div>
      <div class="card-body">
        <div class="card-title">${s(sp.instrument) || s(sp.category)}</div>
        <div class="card-sub"><strong>${s(sp.category)}</strong>${s(sp.rationale) ? ' &nbsp;·&nbsp; ' + s(sp.rationale) : ''}</div>
      </div>
      ${n(sp.amount) > 0 ? `<div class="card-right"><div class="card-amount">${inr(n(sp.amount))}/mo</div></div>` : ''}
    </div>`).join('')}
  </div>
</div>` : ''}

${allocEntries.length > 0 ? `
<div class="section">
  <div class="st">Asset Allocation</div>
  <div class="alloc-bar">
    ${allocEntries.map(([, v], i) => `<div class="aseg" style="width:${n(v)}%;background:${barColors[i % barColors.length]}">${n(v) >= 8 ? n(v) + '%' : ''}</div>`).join('')}
  </div>
  <div class="aleg">
    ${allocEntries.map(([k, v], i) => `<div class="ali"><div class="adot" style="background:${barColors[i % barColors.length]}"></div>${k.charAt(0).toUpperCase() + k.slice(1)}: <strong>${n(v)}%</strong></div>`).join('')}
  </div>
</div>` : ''}

${actionItems.length > 0 ? `
<div class="section">
  <div class="st">Action Plan</div>
  ${actionItems.map(item => {
    const p = s(item.priority).toLowerCase() || 'medium'
    return `
    <div class="action" style="background:${priBg[p] || '#f8fafc'}">
      <span class="badge" style="background:${priBg[p]};color:${priCol[p]};border:1px solid ${priCol[p]}40;flex-shrink:0;margin-top:1px">${p.toUpperCase()}</span>
      <div class="action-text">
        <div class="main">${s(item.action)}</div>
        ${s(item.timeline) ? `<div class="time">⏱ Timeline: ${s(item.timeline)}</div>` : ''}
      </div>
    </div>`}).join('')}
</div>` : ''}

${insights.length > 0 ? `
<div class="section">
  <div class="st">Key Insights</div>
  <div class="nlist">
    ${insights.map((ins, i) => `
    <div class="ni"><div class="nc blue">${i + 1}</div><div class="nt">${ins}</div></div>`).join('')}
  </div>
</div>` : ''}

${(n(fireM.requiredSIP) > 0 || n(fireM.retirementCorpusNeeded) > 0) ? `
<div class="section">
  <div class="st">FIRE Plan Metrics</div>
  <div class="fire-grid">
    <div class="fc"><div class="fv">${inr(n(fireM.requiredSIP))}</div><div class="fl">Monthly SIP Required</div></div>
    <div class="fc blue"><div class="fv">${inr(n(fireM.retirementCorpusNeeded))}</div><div class="fl">Retirement Corpus</div></div>
    <div class="fc amber"><div class="fv">${n(fireM.yearsToRetirement)} years</div><div class="fl">Years to Retirement</div></div>
    <div class="fc"><div class="fv">${pct(fireM.savingsRate)}</div><div class="fl">Savings Rate</div></div>
  </div>
</div>` : ''}

${n(portM.totalInvested) > 0 ? (() => {
  const inv = n(portM.totalInvested)
  const cur = n(portM.totalCurrentValue)
  const ret = inv > 0 ? ((cur - inv) / inv * 100).toFixed(2) : '0'
  return `
<div class="section">
  <div class="st">Portfolio Analysis</div>
  <table class="kvt">
    <tr><td>Total Invested</td><td>${inr(inv)}</td></tr>
    <tr><td>Current Value</td><td class="${cur >= inv ? 'green' : 'red'}">${inr(cur)}</td></tr>
    <tr><td>Absolute Returns</td><td class="${cur >= inv ? 'green' : 'red'}">${ret}%</td></tr>
    <tr><td>XIRR (Annualised)</td><td class="${xirr >= 12 ? 'green' : 'amber'}">${xirr ? pct(xirr) : '—'}</td></tr>
    <tr><td>Avg Expense Ratio</td><td>${n(portM.averageExpenseRatio).toFixed(2)}%</td></tr>
  </table>
</div>`
})() : ''}

${rebalancePlan.length > 0 ? `
<div class="section">
  <div class="st">Portfolio Rebalancing</div>
  <div class="card-list">
    ${rebalancePlan.map(rb => {
      const act = s(rb.action).toLowerCase()
      const ac  = ['sell','reduce'].includes(act) ? '#dc2626' : act === 'hold' ? '#2563eb' : '#059669'
      return `
    <div class="card">
      <div class="card-accent" style="background:${ac}"></div>
      <div class="card-body">
        <div class="card-title"><span class="badge" style="background:${ac}20;color:${ac};margin-right:6px">${s(rb.action).toUpperCase()}</span>${s(rb.fund)}</div>
        <div class="card-sub">${s(rb.reason)}</div>
      </div>
    </div>`}).join('')}
  </div>
</div>` : ''}

${explainability ? `
<div class="section">
  <div class="st">Why This Recommendation?</div>
  <div class="tb blue">${explainability}</div>
</div>` : ''}

<div class="disc">
  <div class="disc-title">⚠ SEBI Disclaimer</div>
  <p>This report is AI-generated for educational and informational purposes only. It does not constitute SEBI-registered investment advice, portfolio management services, or certified financial planning. Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully. Past performance is not indicative of future results. Consult a SEBI-registered investment advisor or certified financial planner before making any investment decisions.</p>
</div>

<div class="footer">
  <span>AI Money Mentor &nbsp;·&nbsp; 7-Agent Autonomous Financial Analysis</span>
  <span>Generated ${now}</span>
</div>

</div>
</body>
</html>`

  // Open in new tab — user clicks "Save as PDF" button at top right
  const newTab = window.open('', '_blank')
  if (!newTab) {
    // Fallback: download as HTML file
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href     = url
    link.download = 'money-mentor-report-' + new Date().toISOString().split('T')[0] + '.html'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 3000)
    return
  }
  newTab.document.write(html)
  newTab.document.close()
  // Auto-trigger print after fonts load
  setTimeout(() => { newTab.focus(); newTab.print() }, 800)
}