'use client'

function s(v: unknown): string { return v ? String(v) : '' }
function n(v: unknown): number { const x = Number(v); return isNaN(x) ? 0 : x }
function a<T>(v: unknown): T[] { return Array.isArray(v) ? v as T[] : [] }
function o(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
}
function inr(amount: number): string {
  if (!amount) return '—'
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

export async function generateAndDownloadPDF(rawReport: unknown, userName: string) {
  const report   = o(rawReport)
  const outputs  = o(report.outputs)
  const plan     = o(outputs.plan)
  const analysis = o(outputs.analysis)
  const impact   = o(outputs.impactDashboard)
  const metrics  = o(report.metrics)

  const strategy         = s(plan.strategy)
  const explainability   = s(plan.explainability)
  const sipPlan          = a<Record<string,unknown>>(plan.sipPlan)
  const actionItems      = a<Record<string,unknown>>(plan.actionItems)
  const insights         = a<string>(plan.insights)
  const taxSuggestions   = a<string>(plan.taxSuggestions)
  const missedDeductions = a<Record<string,unknown>>(plan.missedDeductions)
  const rebalancingPlan  = a<Record<string,unknown>>(plan.rebalancingPlan)
  const assetAlloc       = o(plan.assetAllocation)

  const taxResult = o(analysis.taxResult)
  const oldRegime = o(taxResult.oldRegime)
  const newRegime = o(taxResult.newRegime)
  const fireM     = o(analysis.fireMetrics)
  const portM     = o(analysis.portfolioMetrics)
  const overlap   = o(portM.overlap ?? portM.overlap)

  const taxSaved    = n(impact.taxSaved) || n(metrics.taxSaved)
  const retReady    = n(impact.retirementReadiness) || n(metrics.retirementReadiness)
  const healthScore = n(metrics.healthScore)
  const xirr        = n(metrics.xirr) || n(portM.xirr)
  const taxRec      = s(taxResult.recommendation) || 'new'
  const taxSavings  = n(taxResult.savings)
  const oldTax      = n(oldRegime.tax)
  const newTax      = n(newRegime.tax)

  const now = new Date().toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  // Priority colors
  const priBg:  Record<string,string> = { high: '#fee2e2', medium: '#fef3c7', low: '#d1fae5' }
  const priCol: Record<string,string> = { high: '#dc2626', medium: '#d97706', low: '#059669' }

  // ── Build HTML ──────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Money Mentor Report - ${userName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: #fff;
    color: #111827;
    font-size: 13px;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── HEADER ── */
  .header {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    color: white;
    padding: 36px 40px 28px;
    position: relative;
    overflow: hidden;
  }
  .header::after {
    content: '';
    position: absolute;
    top: -30px; right: -30px;
    width: 160px; height: 160px;
    border-radius: 50%;
    background: rgba(255,255,255,0.06);
  }
  .header-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px; height: 44px;
    background: rgba(255,255,255,0.2);
    border-radius: 12px;
    font-size: 22px;
    margin-bottom: 12px;
  }
  .header h1 {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }
  .header .subtitle { font-size: 13px; opacity: 0.85; margin-bottom: 2px; }
  .header .meta     { font-size: 11px; opacity: 0.65; margin-top: 8px; }

  /* ── IMPACT ROW ── */
  .impact-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding: 20px 40px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }
  .impact-card {
    background: white;
    border-radius: 10px;
    padding: 14px 16px;
    border-left: 4px solid #059669;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .impact-card.blue   { border-left-color: #2563eb; }
  .impact-card.amber  { border-left-color: #d97706; }
  .impact-value { font-size: 20px; font-weight: 800; color: #059669; line-height: 1.2; }
  .impact-card.blue  .impact-value { color: #2563eb; }
  .impact-card.amber .impact-value { color: #d97706; }
  .impact-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; font-weight: 600; }

  /* ── CONTENT ── */
  .content { padding: 0 40px 40px; }

  /* ── SECTION ── */
  .section { margin-top: 28px; }
  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: #059669;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding-bottom: 8px;
    border-bottom: 2px solid #d1fae5;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-title::before {
    content: '';
    display: inline-block;
    width: 4px; height: 16px;
    background: #059669;
    border-radius: 2px;
    flex-shrink: 0;
  }

  /* ── TEXT BLOCK ── */
  .text-block {
    background: #f0fdf4;
    border-left: 3px solid #059669;
    border-radius: 0 8px 8px 0;
    padding: 12px 16px;
    font-size: 13px;
    line-height: 1.7;
    color: #374151;
  }
  .text-block.blue {
    background: #eff6ff;
    border-left-color: #2563eb;
  }

  /* ── TAX COMPARISON ── */
  .tax-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .tax-card {
    background: #f9fafb;
    border-radius: 10px;
    padding: 18px 20px;
    border: 1.5px solid #e5e7eb;
    position: relative;
  }
  .tax-card.recommended {
    background: #f0fdf4;
    border-color: #059669;
    border-width: 2px;
  }
  .tax-regime-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #6b7280;
    margin-bottom: 6px;
  }
  .tax-amount {
    font-size: 26px;
    font-weight: 800;
    color: #111827;
    line-height: 1.1;
    margin-bottom: 8px;
  }
  .tax-card.recommended .tax-amount { color: #059669; }
  .tax-detail { font-size: 11px; color: #6b7280; margin-bottom: 2px; }
  .rec-badge {
    position: absolute;
    top: 12px; right: 12px;
    background: #059669;
    color: white;
    font-size: 9px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 12px;
    letter-spacing: 0.3px;
  }
  .savings-banner {
    background: #d1fae5;
    border-radius: 8px;
    padding: 12px 16px;
    text-align: center;
    font-size: 14px;
    font-weight: 700;
    color: #065f46;
    margin-top: 4px;
  }

  /* ── CARDS ── */
  .card-list { display: flex; flex-direction: column; gap: 8px; }
  .card-item {
    background: #f8fafc;
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    border-left: 3px solid #059669;
  }
  .card-item.amber { border-left-color: #d97706; background: #fffbeb; }
  .card-item.blue  { border-left-color: #2563eb; background: #eff6ff; }
  .card-item.red   { border-left-color: #dc2626; background: #fef2f2; }
  .card-main { flex: 1; min-width: 0; }
  .card-title { font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 3px; }
  .card-sub   { font-size: 11.5px; color: #6b7280; line-height: 1.5; }
  .card-right { font-size: 14px; font-weight: 800; color: #059669; white-space: nowrap; padding-left: 12px; }
  .card-right.amber { color: #d97706; }

  /* ── PRIORITY BADGE ── */
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap;
    flex-shrink: 0;
    margin-top: 2px;
  }

  /* ── NUMBERED LIST ── */
  .num-list { display: flex; flex-direction: column; gap: 8px; }
  .num-item {
    display: flex;
    gap: 12px;
    padding: 11px 14px;
    background: #f8fafc;
    border-radius: 8px;
    align-items: flex-start;
  }
  .num-circle {
    width: 22px; height: 22px;
    background: #059669;
    color: white;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .num-circle.blue { background: #2563eb; }
  .num-text { font-size: 12.5px; color: #374151; line-height: 1.6; flex: 1; }

  /* ── ALLOCATION BAR ── */
  .alloc-bar {
    height: 28px;
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    margin-bottom: 10px;
  }
  .alloc-seg {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: white;
    min-width: 30px;
  }
  .alloc-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    margin-top: 4px;
  }
  .alloc-leg-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #374151;
  }
  .alloc-dot {
    width: 10px; height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  /* ── KV TABLE ── */
  .kv-table { width: 100%; border-collapse: collapse; }
  .kv-table tr { border-bottom: 1px solid #f3f4f6; }
  .kv-table tr:last-child { border-bottom: none; }
  .kv-table td { padding: 9px 4px; font-size: 13px; }
  .kv-table td:first-child { color: #6b7280; font-weight: 500; }
  .kv-table td:last-child  { font-weight: 700; text-align: right; }
  .kv-table td:last-child.green { color: #059669; }
  .kv-table td:last-child.amber { color: #d97706; }
  .kv-table td:last-child.red   { color: #dc2626; }

  /* ── FIRE GRID ── */
  .fire-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .fire-card {
    background: #f8fafc;
    border-radius: 8px;
    padding: 14px 16px;
    border-left: 3px solid #059669;
  }
  .fire-card.blue  { border-left-color: #2563eb; }
  .fire-card.amber { border-left-color: #d97706; }
  .fire-value { font-size: 18px; font-weight: 800; color: #059669; }
  .fire-card.blue  .fire-value { color: #2563eb; }
  .fire-card.amber .fire-value { color: #d97706; }
  .fire-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600; margin-top: 4px; }

  /* ── DISCLAIMER ── */
  .disclaimer {
    margin-top: 28px;
    background: #fffbeb;
    border: 1.5px solid #fcd34d;
    border-radius: 10px;
    padding: 16px 20px;
  }
  .disclaimer-title { font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .disclaimer p { font-size: 11.5px; color: #78350f; line-height: 1.7; }

  /* ── FOOTER ── */
  .footer {
    margin-top: 32px;
    padding-top: 14px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #9ca3af;
  }

  /* ── ACTION ITEM ── */
  .action-item {
    display: flex;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 8px;
    margin-bottom: 8px;
    align-items: flex-start;
  }
  .action-item.high   { background: #fef2f2; }
  .action-item.medium { background: #fffbeb; }
  .action-item.low    { background: #f0fdf4; }
  .action-text { flex: 1; }
  .action-main { font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 3px; }
  .action-time { font-size: 11px; color: #9ca3af; }

  /* ── PRINT ── */
  @media print {
    body { font-size: 12px; }
    .no-print { display: none !important; }
    .section { break-inside: avoid; }
    .card-item, .num-item, .action-item, .tax-card { break-inside: avoid; }
    @page { margin: 16mm 14mm; size: A4; }
  }

  .print-btn {
    position: fixed;
    top: 16px; right: 16px;
    background: #059669;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    z-index: 999;
    box-shadow: 0 4px 12px rgba(5,150,105,0.4);
  }
  .print-btn:hover { background: #047857; }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">⬇ Save as PDF</button>

<!-- HEADER -->
<div class="header">
  <div class="header-logo">💰</div>
  <h1>AI Money Mentor Report</h1>
  <div class="subtitle">Prepared for <strong>${userName}</strong></div>
  <div class="subtitle">Generated on ${now}</div>
  <div class="meta">
    Report ID: ${s(report.reportId) || 'N/A'} &nbsp;·&nbsp;
    Profile v${n(report.profileVersion) || 1} &nbsp;·&nbsp;
    7-Agent Autonomous Financial Analysis
  </div>
</div>

<!-- IMPACT METRICS -->
<div class="impact-row">
  <div class="impact-card">
    <div class="impact-value">${healthScore ? `${healthScore}/100` : 'N/A'}</div>
    <div class="impact-label">Health Score</div>
  </div>
  <div class="impact-card blue">
    <div class="impact-value">${retReady ? `${retReady}%` : 'N/A'}</div>
    <div class="impact-label">Retirement Ready</div>
  </div>
  <div class="impact-card">
    <div class="impact-value">${taxSaved ? inr(taxSaved) : 'N/A'}</div>
    <div class="impact-label">Tax Saved</div>
  </div>
  <div class="impact-card amber">
    <div class="impact-value">${xirr ? `${xirr.toFixed(1)}%` : 'N/A'}</div>
    <div class="impact-label">Portfolio XIRR</div>
  </div>
</div>

<!-- CONTENT -->
<div class="content">

${strategy ? `
<div class="section">
  <div class="section-title">Strategy Summary</div>
  <div class="text-block">${strategy}</div>
</div>` : ''}

${(oldTax > 0 || newTax > 0) ? `
<div class="section">
  <div class="section-title">Tax Regime Comparison</div>
  <div class="tax-grid">
    <div class="tax-card ${taxRec === 'old' ? 'recommended' : ''}">
      ${taxRec === 'old' ? '<span class="rec-badge">✓ RECOMMENDED</span>' : ''}
      <div class="tax-regime-label">Old Tax Regime</div>
      <div class="tax-amount">${inr(oldTax)}</div>
      <div class="tax-detail">Taxable Income: ${inr(n(oldRegime.taxableIncome))}</div>
      <div class="tax-detail">Effective Rate: ${n(oldRegime.effectiveRate).toFixed(1)}%</div>
    </div>
    <div class="tax-card ${taxRec === 'new' ? 'recommended' : ''}">
      ${taxRec === 'new' ? '<span class="rec-badge">✓ RECOMMENDED</span>' : ''}
      <div class="tax-regime-label">New Tax Regime</div>
      <div class="tax-amount">${inr(newTax)}</div>
      <div class="tax-detail">Taxable Income: ${inr(n(newRegime.taxableIncome))}</div>
      <div class="tax-detail">Effective Rate: ${n(newRegime.effectiveRate).toFixed(1)}%</div>
    </div>
  </div>
  ${taxSavings > 0 ? `<div class="savings-banner">✓ You save ${inr(taxSavings)} by choosing the ${taxRec.toUpperCase()} Tax Regime</div>` : ''}
</div>` : ''}

${taxSuggestions.length > 0 ? `
<div class="section">
  <div class="section-title">Tax Saving Suggestions</div>
  <div class="num-list">
    ${taxSuggestions.map((s, i) => `
      <div class="num-item">
        <div class="num-circle">${i + 1}</div>
        <div class="num-text">${s}</div>
      </div>`).join('')}
  </div>
</div>` : ''}

${missedDeductions.length > 0 ? `
<div class="section">
  <div class="section-title">Missed Deductions — Claim Before March 31</div>
  <div class="card-list">
    ${missedDeductions.map(d => `
      <div class="card-item amber">
        <div class="card-main">
          <div class="card-title">${s(d.section)}</div>
          <div class="card-sub">${s(d.description)}${n(d.limit) > 0 ? ` &nbsp;·&nbsp; Max Limit: ${inr(n(d.limit))}` : ''}</div>
        </div>
        <div class="card-right">${inr(n(d.saving))}<br/><span style="font-size:10px;color:#6b7280;font-weight:500">potential saving</span></div>
      </div>`).join('')}
  </div>
</div>` : ''}

${sipPlan.length > 0 ? `
<div class="section">
  <div class="section-title">Recommended SIP Plan</div>
  <div class="card-list">
    ${sipPlan.map(sp => `
      <div class="card-item">
        <div class="card-main">
          <div class="card-title">${s(sp.instrument) || s(sp.category)}</div>
          <div class="card-sub">
            <strong>${s(sp.category)}</strong>${s(sp.rationale) ? ' &nbsp;·&nbsp; ' + s(sp.rationale) : ''}
          </div>
        </div>
        ${n(sp.amount) > 0 ? `<div class="card-right">${inr(n(sp.amount))}<br/><span style="font-size:10px;color:#6b7280;font-weight:500">per month</span></div>` : ''}
      </div>`).join('')}
  </div>
</div>` : ''}

${Object.keys(assetAlloc).length > 0 ? (() => {
  const colors = ['#059669','#2563eb','#d97706','#6b7280','#7c3aed']
  const entries = Object.entries(assetAlloc).filter(([,v]) => n(v) > 0)
  return `
<div class="section">
  <div class="section-title">Asset Allocation</div>
  <div class="alloc-bar">
    ${entries.map(([,v], i) => `
      <div class="alloc-seg" style="width:${n(v)}%;background:${colors[i%colors.length]}">
        ${n(v) >= 8 ? `${n(v)}%` : ''}
      </div>`).join('')}
  </div>
  <div class="alloc-legend">
    ${entries.map(([k,v], i) => `
      <div class="alloc-leg-item">
        <div class="alloc-dot" style="background:${colors[i%colors.length]}"></div>
        ${k.charAt(0).toUpperCase() + k.slice(1)}: <strong>${n(v)}%</strong>
      </div>`).join('')}
  </div>
</div>`
})() : ''}

${actionItems.length > 0 ? `
<div class="section">
  <div class="section-title">Action Plan</div>
  ${actionItems.map(a => {
    const p = s(a.priority).toLowerCase() || 'medium'
    return `
    <div class="action-item ${p}">
      <span class="badge" style="background:${priBg[p]||'#e5e7eb'};color:${priCol[p]||'#374151'}">${p.toUpperCase()}</span>
      <div class="action-text">
        <div class="action-main">${s(a.action)}</div>
        ${s(a.timeline) ? `<div class="action-time">⏱ ${s(a.timeline)}</div>` : ''}
      </div>
    </div>`}).join('')}
</div>` : ''}

${insights.length > 0 ? `
<div class="section">
  <div class="section-title">Key Insights</div>
  <div class="num-list">
    ${insights.map((ins, i) => `
      <div class="num-item">
        <div class="num-circle blue">${i + 1}</div>
        <div class="num-text">${ins}</div>
      </div>`).join('')}
  </div>
</div>` : ''}

${(n(fireM.requiredSIP) > 0 || n(fireM.retirementCorpusNeeded) > 0) ? `
<div class="section">
  <div class="section-title">FIRE Plan Metrics</div>
  <div class="fire-grid">
    <div class="fire-card">
      <div class="fire-value">${inr(n(fireM.requiredSIP))}</div>
      <div class="fire-label">Monthly SIP Required</div>
    </div>
    <div class="fire-card blue">
      <div class="fire-value">${inr(n(fireM.retirementCorpusNeeded))}</div>
      <div class="fire-label">Retirement Corpus Needed</div>
    </div>
    <div class="fire-card amber">
      <div class="fire-value">${n(fireM.yearsToRetirement)} years</div>
      <div class="fire-label">Years to Retirement</div>
    </div>
    <div class="fire-card">
      <div class="fire-value">${n(fireM.savingsRate)}%</div>
      <div class="fire-label">Current Savings Rate</div>
    </div>
  </div>
</div>` : ''}

${n(portM.totalInvested) > 0 ? `
<div class="section">
  <div class="section-title">Portfolio Analysis</div>
  <table class="kv-table">
    <tr><td>Total Invested</td><td>${inr(n(portM.totalInvested))}</td></tr>
    <tr><td>Current Value</td><td class="${n(portM.totalCurrentValue) >= n(portM.totalInvested) ? 'green' : 'red'}">${inr(n(portM.totalCurrentValue))}</td></tr>
    <tr><td>Absolute Returns</td><td class="${n(portM.totalCurrentValue) >= n(portM.totalInvested) ? 'green' : 'red'}">
      ${n(portM.totalInvested) > 0 ? ((n(portM.totalCurrentValue) - n(portM.totalInvested)) / n(portM.totalInvested) * 100).toFixed(2) + '%' : '—'}
    </td></tr>
    <tr><td>XIRR (Annualized)</td><td class="${xirr >= 12 ? 'green' : 'amber'}">${xirr ? xirr.toFixed(2) + '%' : '—'}</td></tr>
    <tr><td>Avg Expense Ratio</td><td>${n(portM.averageExpenseRatio).toFixed(2)}%</td></tr>
    <tr><td>Overlap Score</td><td>${n(overlap.overlapScore) ? n(overlap.overlapScore) + '/100' : '—'}</td></tr>
    <tr><td>Diversification Score</td><td class="green">${n(overlap.diversificationScore) ? n(overlap.diversificationScore) + '/100' : '—'}</td></tr>
  </table>
</div>` : ''}

${rebalancingPlan.length > 0 ? `
<div class="section">
  <div class="section-title">Portfolio Rebalancing Plan</div>
  <div class="card-list">
    ${rebalancingPlan.map(rb => {
      const act = s(rb.action).toLowerCase()
      const cls = ['sell','reduce'].includes(act) ? 'red' : ['hold'].includes(act) ? 'blue' : ''
      return `
      <div class="card-item ${cls}">
        <div class="card-main">
          <div class="card-title">
            <span class="badge" style="background:${priBg.medium};color:${priCol.medium};margin-right:6px">${s(rb.action).toUpperCase()}</span>
            ${s(rb.fund)}
          </div>
          <div class="card-sub">${s(rb.reason)}</div>
        </div>
      </div>`}).join('')}
  </div>
</div>` : ''}

${explainability ? `
<div class="section">
  <div class="section-title">Why This Recommendation?</div>
  <div class="text-block blue">${explainability}</div>
</div>` : ''}

<div class="disclaimer">
  <div class="disclaimer-title">⚠ SEBI Disclaimer</div>
  <p>This report is AI-generated for educational and informational purposes only. It does not constitute SEBI-registered investment advice, portfolio management services, or certified financial planning. Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing. Past performance is not indicative of future results. Consult a SEBI-registered investment advisor or certified financial planner before making any investment decisions.</p>
</div>

<div class="footer">
  <span>AI Money Mentor &nbsp;·&nbsp; 7-Agent Autonomous Financial Analysis System</span>
  <span>Generated ${now}</span>
</div>

</div><!-- /content -->
</body>
</html>`

  // Open in new window and auto-trigger print dialog
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) {
    alert('Please allow popups for this site to download the PDF report.')
    return
  }
  win.document.write(html)
  win.document.close()

  // Wait for fonts to load then open print dialog
  setTimeout(() => {
    win.focus()
    win.print()
  }, 1200)
}