'use client'

// ── Helpers ───────────────────────────────────────────────────────────────
function toStr(v: unknown): string { return v ? String(v) : '' }
function toNum(v: unknown): number { const x = Number(v); return isNaN(x) || !isFinite(x) ? 0 : x }
function toArr(v: unknown): Record<string, unknown>[] { return Array.isArray(v) ? (v as Record<string, unknown>[]) : [] }
function toStrArr(v: unknown): string[] { return Array.isArray(v) ? (v as string[]) : [] }
function toObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}
function inr(amount: unknown): string {
  const n = toNum(amount)
  if (!n) return 'N/A'
  if (n >= 10000000) return `Rs.${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000)   return `Rs.${(n / 100000).toFixed(2)} L`
  return `Rs.${Math.round(n).toLocaleString('en-IN')}`
}
function pct(v: unknown): string {
  const n = toNum(v)
  return n ? `${n.toFixed(1)}%` : 'N/A'
}

type RGB = [number, number, number]

// ── Main export — async to avoid nested function declarations ─────────────
export async function generateAndDownloadPDF(rawReport: unknown, userName: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // ── Extract data ──────────────────────────────────────────────────────
  const report   = toObj(rawReport)
  const outputs  = toObj(report.outputs)
  const plan     = toObj(outputs.plan)
  const analysis = toObj(outputs.analysis)
  const impact   = toObj(outputs.impactDashboard)
  const metrics  = toObj(report.metrics)

  const strategy       = toStr(plan.strategy)
  const explainability = toStr(plan.explainability)
  const sipPlan        = toArr(plan.sipPlan)
  const actionItems    = toArr(plan.actionItems)
  const insights       = toStrArr(plan.insights)
  const taxSuggestions = toStrArr(plan.taxSuggestions)
  const missedDeducts  = toArr(plan.missedDeductions)
  const rebalancePlan  = toArr(plan.rebalancingPlan)
  const assetAlloc     = toObj(plan.assetAllocation)

  const taxResult  = toObj(analysis.taxResult)
  const oldRegime  = toObj(taxResult.oldRegime)
  const newRegime  = toObj(taxResult.newRegime)
  const fireM      = toObj(analysis.fireMetrics)
  const portM      = toObj(analysis.portfolioMetrics)

  const taxSaved    = toNum(impact.taxSaved) || toNum(metrics.taxSaved)
  const retReady    = toNum(impact.retirementReadiness) || toNum(metrics.retirementReadiness)
  const healthScore = toNum(metrics.healthScore)
  const xirr        = toNum(metrics.xirr) || toNum(portM.xirr)
  const taxRec      = toStr(taxResult.recommendation) || 'new'
  const taxSavings  = toNum(taxResult.savings)
  const oldTax      = toNum(oldRegime.tax)
  const newTax      = toNum(newRegime.tax)
  const now = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── Layout ────────────────────────────────────────────────────────────
  const W = 210
  const M = 15
  const CW = W - M * 2
  let y = 0

  // ── Colors ────────────────────────────────────────────────────────────
  const GREEN:   RGB = [5, 150, 105]
  const DGREEN:  RGB = [4, 110, 75]
  const BLUE:    RGB = [37, 99, 235]
  const AMBER:   RGB = [180, 100, 10]
  const RED:     RGB = [185, 28, 28]
  const DARK:    RGB = [17, 24, 39]
  const MID:     RGB = [75, 85, 99]
  const LIGHT:   RGB = [156, 163, 175]
  const BG:      RGB = [248, 250, 252]
  const WHITE:   RGB = [255, 255, 255]
  const GBORDER: RGB = [209, 250, 229]

  // ── Drawing utilities (arrow functions — allowed inside blocks) ────────
  const newPage = () => { doc.addPage(); y = M }
  const needsPage = (h: number) => { if (y + h > 277) newPage() }

  const setFont = (size: number, style: 'normal' | 'bold', color: RGB = DARK) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', style)
    doc.setTextColor(...color)
  }

  const fillRect = (x: number, yy: number, w: number, h: number, color: RGB) => {
    doc.setFillColor(...color)
    doc.rect(x, yy, w, h, 'F')
  }

  const roundRect = (x: number, yy: number, w: number, h: number, color: RGB, border?: RGB) => {
    doc.setFillColor(...color)
    doc.roundedRect(x, yy, w, h, 2, 2, border ? 'FD' : 'F')
    if (border) { doc.setDrawColor(...border); doc.setLineWidth(0.4) }
  }

  const sectionHeader = (title: string) => {
    needsPage(16)
    y += 5
    fillRect(M, y, 4, 9, GREEN)
    setFont(10, 'bold', DARK)
    doc.text(title, M + 7, y + 6.5)
    doc.setDrawColor(...GBORDER)
    doc.setLineWidth(0.3)
    doc.line(M, y + 9.5, M + CW, y + 9.5)
    y += 14
  }

  const kvRow = (label: string, value: string, valColor: RGB = DARK) => {
    needsPage(8)
    setFont(8.5, 'normal', MID)
    doc.text(label, M, y)
    setFont(8.5, 'bold', valColor)
    doc.text(value, M + CW, y, { align: 'right' })
    doc.setDrawColor(240, 242, 244)
    doc.setLineWidth(0.2)
    doc.line(M, y + 2, M + CW, y + 2)
    y += 7
  }

  // ══════════════════════════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════════════════════════
  fillRect(0, 0, W, 48, GREEN)
  fillRect(0, 42, W, 6, DGREEN)
  doc.setFillColor(...WHITE)
  doc.circle(M + 10, 18, 9, 'F')
  setFont(10, 'bold', GREEN)
  doc.text('AI', M + 6.5, 22)
  setFont(18, 'bold', WHITE)
  doc.text('AI Money Mentor Report', M + 24, 16)
  setFont(10, 'normal', WHITE)
  doc.text(`Prepared for ${userName}`, M + 24, 24)
  setFont(8, 'normal', [200, 240, 220] as RGB)
  doc.text(`${now}   |   7-Agent Autonomous Analysis`, M + 24, 30)
  doc.text(`Report: ${toStr(report.reportId).slice(0, 36) || 'N/A'}   |   v${toNum(report.profileVersion) || 1}`, M, 43)
  y = 58

  // ── Impact cards ──────────────────────────────────────────────────────
  const cw4 = (CW - 6) / 4
  const impactItems: Array<{ label: string; value: string; color: RGB }> = [
    { label: 'Health Score',     value: healthScore ? `${healthScore}/100` : 'N/A', color: GREEN },
    { label: 'Retirement Ready', value: retReady    ? `${retReady}%`       : 'N/A', color: BLUE  },
    { label: 'Tax Saved',        value: taxSaved    ? inr(taxSaved)        : 'N/A', color: GREEN },
    { label: 'Portfolio XIRR',   value: xirr        ? pct(xirr)            : 'N/A', color: AMBER },
  ]
  impactItems.forEach((item, i) => {
    const cx = M + i * (cw4 + 2)
    roundRect(cx, y, cw4, 22, BG)
    fillRect(cx, y, 3, 22, item.color)
    setFont(12, 'bold', item.color)
    doc.text(item.value, cx + 5, y + 12)
    setFont(6.5, 'normal', LIGHT)
    doc.text(item.label.toUpperCase(), cx + 5, y + 18)
  })
  y += 28

  // ══════════════════════════════════════════════════════════════════════
  // STRATEGY
  // ══════════════════════════════════════════════════════════════════════
  if (strategy) {
    sectionHeader('STRATEGY SUMMARY')
    const lines = doc.splitTextToSize(strategy, CW - 8)
    const h = lines.length * 5.5 + 8
    needsPage(h + 4)
    roundRect(M, y, CW, h, [240, 253, 244] as RGB)
    fillRect(M, y, 3, h, GREEN)
    setFont(8.5, 'normal', DARK)
    doc.text(lines, M + 6, y + 6)
    y += h + 6
  }

  // ══════════════════════════════════════════════════════════════════════
  // TAX COMPARISON
  // ══════════════════════════════════════════════════════════════════════
  if (oldTax > 0 || newTax > 0) {
    sectionHeader('TAX REGIME COMPARISON')
    needsPage(52)
    const hw = (CW - 6) / 2
    const regimes = [
      { label: 'Old Tax Regime', tax: oldTax, eff: toNum(oldRegime.effectiveRate), taxable: toNum(oldRegime.taxableIncome), rec: taxRec === 'old' },
      { label: 'New Tax Regime', tax: newTax, eff: toNum(newRegime.effectiveRate), taxable: toNum(newRegime.taxableIncome), rec: taxRec === 'new' },
    ]
    regimes.forEach((r, i) => {
      const rx = M + i * (hw + 6)
      roundRect(rx, y, hw, 38, r.rec ? ([240, 253, 244] as RGB) : BG)
      if (r.rec) {
        doc.setDrawColor(...GREEN); doc.setLineWidth(0.7)
        doc.roundedRect(rx, y, hw, 38, 2, 2, 'S')
        fillRect(rx + hw - 34, y + 3, 31, 6, GREEN)
        setFont(6, 'bold', WHITE)
        doc.text('RECOMMENDED', rx + hw - 18.5, y + 7.5, { align: 'center' })
      }
      setFont(7.5, 'bold', r.rec ? GREEN : MID)
      doc.text(r.label.toUpperCase(), rx + 4, y + 8)
      setFont(16, 'bold', r.rec ? GREEN : DARK)
      doc.text(inr(r.tax), rx + 4, y + 22)
      setFont(7.5, 'normal', MID)
      doc.text(`Taxable: ${inr(r.taxable)}`, rx + 4, y + 29)
      doc.text(`Eff. Rate: ${r.eff.toFixed(1)}%`, rx + 4, y + 35)
    })
    y += 42
    if (taxSavings > 0) {
      needsPage(14)
      roundRect(M, y, CW, 10, [209, 250, 229] as RGB)
      setFont(9, 'bold', DGREEN)
      doc.text(`You save ${inr(taxSavings)} by choosing the ${taxRec.toUpperCase()} tax regime`, M + CW / 2, y + 7, { align: 'center' })
      y += 14
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // TAX SUGGESTIONS
  // ══════════════════════════════════════════════════════════════════════
  if (taxSuggestions.length > 0) {
    sectionHeader('TAX SAVING SUGGESTIONS')
    taxSuggestions.forEach((tip, idx) => {
      const lines = doc.splitTextToSize(tip, CW - 12)
      const h = lines.length * 5.5 + 8
      needsPage(h + 4)
      roundRect(M, y, CW, h, BG)
      setFont(9, 'bold', GREEN)
      doc.text(`${idx + 1}`, M + 4, y + 6.5)
      setFont(8.5, 'normal', DARK)
      doc.text(lines, M + 12, y + 6.5)
      y += h + 4
    })
    y += 2
  }

  // ══════════════════════════════════════════════════════════════════════
  // MISSED DEDUCTIONS
  // ══════════════════════════════════════════════════════════════════════
  if (missedDeducts.length > 0) {
    sectionHeader('MISSED DEDUCTIONS')
    missedDeducts.forEach(d => {
      const lim  = toNum(d.limit)
      const full = toStr(d.description) + (lim > 0 ? `  (Max: ${inr(lim)})` : '')
      const lines = doc.splitTextToSize(full, CW - 55)
      const h = Math.max(16, lines.length * 5 + 10)
      needsPage(h + 4)
      roundRect(M, y, CW, h, [255, 251, 235] as RGB)
      fillRect(M, y, 3, h, AMBER)
      setFont(9, 'bold', DARK)
      doc.text(toStr(d.section), M + 6, y + 7)
      setFont(7.5, 'normal', MID)
      doc.text(lines, M + 6, y + 13)
      setFont(10, 'bold', GREEN)
      doc.text(inr(toNum(d.saving)), M + CW - 2, y + h / 2 + 2, { align: 'right' })
      setFont(6.5, 'normal', LIGHT)
      doc.text('potential saving', M + CW - 2, y + h / 2 + 7, { align: 'right' })
      y += h + 5
    })
  }

  // ══════════════════════════════════════════════════════════════════════
  // SIP PLAN
  // ══════════════════════════════════════════════════════════════════════
  if (sipPlan.length > 0) {
    sectionHeader('RECOMMENDED SIP PLAN')
    sipPlan.forEach(sp => {
      const rat   = toStr(sp.rationale)
      const lines = rat ? doc.splitTextToSize(rat, CW - 55) : []
      const h     = Math.max(16, lines.length * 5 + 10)
      needsPage(h + 4)
      roundRect(M, y, CW, h, BG)
      fillRect(M, y, 3, h, GREEN)
      setFont(9, 'bold', DARK)
      doc.text(toStr(sp.instrument) || toStr(sp.category), M + 6, y + 7)
      setFont(7, 'normal', MID)
      doc.text(`Category: ${toStr(sp.category)}`, M + 6, y + 12.5)
      if (lines.length > 0) {
        setFont(7.5, 'normal', MID)
        doc.text(lines, M + 6, y + 18)
      }
      if (toNum(sp.amount) > 0) {
        setFont(10, 'bold', GREEN)
        doc.text(`${inr(toNum(sp.amount))}/mo`, M + CW - 2, y + 9, { align: 'right' })
      }
      y += h + 4
    })
  }

  // ══════════════════════════════════════════════════════════════════════
  // ASSET ALLOCATION
  // ══════════════════════════════════════════════════════════════════════
  const allocEntries = Object.entries(assetAlloc).filter(([, v]) => toNum(v) > 0)
  if (allocEntries.length > 0) {
    sectionHeader('ASSET ALLOCATION')
    needsPage(30)
    const barColors: RGB[] = [GREEN, BLUE, AMBER, MID, [124, 58, 237] as RGB]
    let xb = M
    allocEntries.forEach(([, v], i) => {
      const bw = (toNum(v) / 100) * CW
      fillRect(xb, y, bw, 12, barColors[i % barColors.length])
      if (bw > 14) {
        setFont(8, 'bold', WHITE)
        doc.text(`${toNum(v)}%`, xb + bw / 2, y + 8.5, { align: 'center' })
      }
      xb += bw
    })
    y += 16
    let xl = M
    allocEntries.forEach(([k, v], i) => {
      fillRect(xl, y, 5, 5, barColors[i % barColors.length])
      setFont(8, 'normal', DARK)
      doc.text(`${k.charAt(0).toUpperCase() + k.slice(1)}: ${toNum(v)}%`, xl + 7, y + 4)
      xl += 46
      if (xl > M + CW - 46) { xl = M; y += 8 }
    })
    y += 10
  }

  // ══════════════════════════════════════════════════════════════════════
  // ACTION PLAN
  // ══════════════════════════════════════════════════════════════════════
  if (actionItems.length > 0) {
    sectionHeader('ACTION PLAN')
    const priColor: Record<string, RGB> = { high: RED, medium: AMBER, low: GREEN }
    const priBg: Record<string, RGB>    = { high: [254, 242, 242], medium: [255, 251, 235], low: [240, 253, 244] }
    actionItems.forEach(item => {
      const pri   = toStr(item.priority).toLowerCase() || 'medium'
      const time  = toStr(item.timeline)
      const lines = doc.splitTextToSize(toStr(item.action), CW - 30)
      const h     = Math.max(16, lines.length * 5.5 + (time ? 10 : 6))
      needsPage(h + 4)
      roundRect(M, y, CW, h, priBg[pri] ?? BG)
      fillRect(M, y, 3, h, priColor[pri] ?? MID)
      fillRect(M + 5, y + 4, 18, 5, priColor[pri] ?? MID)
      setFont(6, 'bold', WHITE)
      doc.text(pri.toUpperCase(), M + 14, y + 7.8, { align: 'center' })
      setFont(8.5, 'bold', DARK)
      doc.text(lines, M + 26, y + 7)
      if (time) {
        setFont(7, 'normal', LIGHT)
        doc.text(`Timeline: ${time}`, M + 26, y + h - 4)
      }
      y += h + 4
    })
  }

  // ══════════════════════════════════════════════════════════════════════
  // KEY INSIGHTS
  // ══════════════════════════════════════════════════════════════════════
  if (insights.length > 0) {
    sectionHeader('KEY INSIGHTS')
    insights.forEach((ins, idx) => {
      const lines = doc.splitTextToSize(ins, CW - 14)
      const h = lines.length * 5.5 + 8
      needsPage(h + 4)
      roundRect(M, y, CW, h, [239, 246, 255] as RGB)
      fillRect(M, y, 3, h, BLUE)
      setFont(9, 'bold', BLUE)
      doc.text(`${idx + 1}`, M + 6, y + 7)
      setFont(8.5, 'normal', DARK)
      doc.text(lines, M + 13, y + 7)
      y += h + 4
    })
  }

  // ══════════════════════════════════════════════════════════════════════
  // FIRE METRICS
  // ══════════════════════════════════════════════════════════════════════
  const reqSIP = toNum(fireM.requiredSIP)
  const corpus = toNum(fireM.retirementCorpusNeeded)
  if (reqSIP > 0 || corpus > 0) {
    sectionHeader('FIRE PLAN METRICS')
    needsPage(32)
    const fcw = (CW - 6) / 2
    const fireItems: Array<{ label: string; value: string; color: RGB }> = [
      { label: 'Monthly SIP Required',    value: inr(reqSIP),                            color: GREEN },
      { label: 'Retirement Corpus Needed', value: inr(corpus),                           color: BLUE  },
      { label: 'Years to Retirement',      value: `${toNum(fireM.yearsToRetirement)} yrs`, color: AMBER },
      { label: 'Savings Rate',             value: pct(fireM.savingsRate),                color: GREEN },
    ]
    fireItems.forEach((fi, i) => {
      const fx = M + (i % 2) * (fcw + 6)
      if (i === 2) { y += 28; needsPage(32) }
      roundRect(fx, y, fcw, 22, BG)
      fillRect(fx, y, 3, 22, fi.color)
      setFont(12, 'bold', fi.color)
      doc.text(fi.value, fx + 6, y + 13)
      setFont(6.5, 'normal', LIGHT)
      doc.text(fi.label.toUpperCase(), fx + 6, y + 19)
    })
    y += 30
  }

  // ══════════════════════════════════════════════════════════════════════
  // PORTFOLIO
  // ══════════════════════════════════════════════════════════════════════
  const totalInv = toNum(portM.totalInvested)
  const totalCur = toNum(portM.totalCurrentValue)
  if (totalInv > 0) {
    sectionHeader('PORTFOLIO ANALYSIS')
    const retPct = totalInv > 0 ? ((totalCur - totalInv) / totalInv * 100) : 0
    kvRow('Total Invested',    inr(totalInv))
    kvRow('Current Value',     inr(totalCur), totalCur >= totalInv ? GREEN : RED)
    kvRow('Absolute Returns',  `${retPct.toFixed(2)}%`, retPct >= 0 ? GREEN : RED)
    kvRow('XIRR (Annualized)', xirr ? pct(xirr) : 'N/A', xirr >= 12 ? GREEN : AMBER)
    kvRow('Avg Expense Ratio', `${toNum(portM.averageExpenseRatio).toFixed(2)}%`)
    y += 4
  }

  // ══════════════════════════════════════════════════════════════════════
  // REBALANCING
  // ══════════════════════════════════════════════════════════════════════
  if (rebalancePlan.length > 0) {
    sectionHeader('PORTFOLIO REBALANCING')
    rebalancePlan.forEach(rb => {
      const act   = toStr(rb.action).toLowerCase()
      const lines = doc.splitTextToSize(toStr(rb.reason), CW - 30)
      const h     = Math.max(16, lines.length * 5 + 10)
      const col   = ['sell', 'reduce'].includes(act) ? RED : act === 'hold' ? BLUE : GREEN
      needsPage(h + 4)
      roundRect(M, y, CW, h, BG)
      fillRect(M, y, 3, h, col)
      fillRect(M + 5, y + 4, 20, 5, col)
      setFont(6, 'bold', WHITE)
      doc.text(toStr(rb.action).toUpperCase(), M + 15, y + 7.8, { align: 'center' })
      setFont(8.5, 'bold', DARK)
      doc.text(toStr(rb.fund), M + 28, y + 7)
      setFont(7.5, 'normal', MID)
      doc.text(lines, M + 28, y + 12.5)
      y += h + 4
    })
  }

  // ══════════════════════════════════════════════════════════════════════
  // EXPLAINABILITY
  // ══════════════════════════════════════════════════════════════════════
  if (explainability) {
    sectionHeader('WHY THIS RECOMMENDATION?')
    const lines = doc.splitTextToSize(explainability, CW - 8)
    const h = lines.length * 5.5 + 8
    needsPage(h + 4)
    roundRect(M, y, CW, h, [239, 246, 255] as RGB)
    fillRect(M, y, 3, h, BLUE)
    setFont(8.5, 'normal', DARK)
    doc.text(lines, M + 6, y + 6.5)
    y += h + 6
  }

  // ══════════════════════════════════════════════════════════════════════
  // SEBI DISCLAIMER
  // ══════════════════════════════════════════════════════════════════════
  const disc = 'DISCLAIMER: This report is AI-generated for educational purposes only. It does not constitute SEBI-registered investment advice or certified financial planning. Mutual fund investments are subject to market risks. Past performance is not indicative of future results. Consult a SEBI-registered investment advisor before making investment decisions.'
  const discLines = doc.splitTextToSize(disc, CW - 8)
  const discH = discLines.length * 5 + 12
  needsPage(discH + 8)
  y += 4
  roundRect(M, y, CW, discH, [255, 251, 235] as RGB, [253, 211, 77] as RGB)
  setFont(8, 'bold', AMBER)
  doc.text('SEBI DISCLAIMER', M + 5, y + 7)
  setFont(7.5, 'normal', [120, 80, 10] as RGB)
  doc.text(discLines, M + 5, y + 13)

  // ══════════════════════════════════════════════════════════════════════
  // FOOTER ON EVERY PAGE
  // ══════════════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    fillRect(0, 286, W, 11, BG)
    doc.setDrawColor(220, 225, 230)
    doc.setLineWidth(0.3)
    doc.line(0, 286, W, 286)
    setFont(7, 'normal', LIGHT)
    doc.text('AI Money Mentor  |  7-Agent Autonomous Financial Analysis', M, 292)
    setFont(7, 'bold', MID)
    doc.text(`Page ${p} of ${totalPages}`, W - M, 292, { align: 'right' })
  }

  // ── Download ──────────────────────────────────────────────────────────
  const date = new Date().toISOString().split('T')[0]
  doc.save(`money-mentor-report-${date}.pdf`)
}