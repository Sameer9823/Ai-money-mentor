'use client'

function toStr(v: unknown): string { return v ? String(v) : '' }
function toNum(v: unknown): number { const x = Number(v); return isNaN(x) || !isFinite(x) ? 0 : x }
function toArr(v: unknown): Record<string, unknown>[] { return Array.isArray(v) ? (v as Record<string, unknown>[]) : [] }
function toStrArr(v: unknown): string[] { return Array.isArray(v) ? (v as string[]) : [] }
function toObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

// jsPDF helvetica cannot render ₹ — use Rs. consistently
function inr(amount: unknown): string {
  const n = toNum(amount)
  if (!n) return 'N/A'
  if (n >= 10000000) return 'Rs.' + (n / 10000000).toFixed(2) + ' Cr'
  if (n >= 100000)   return 'Rs.' + (n / 100000).toFixed(2) + ' L'
  return 'Rs.' + Math.round(n).toLocaleString('en-IN')
}
function pct(v: unknown): string { const n = toNum(v); return n ? n.toFixed(1) + '%' : 'N/A' }

type RGB = [number, number, number]

export async function generateAndDownloadPDF(rawReport: unknown, userName: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

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
  const taxResult      = toObj(analysis.taxResult)
  const oldRegime      = toObj(taxResult.oldRegime)
  const newRegime      = toObj(taxResult.newRegime)
  const fireM          = toObj(analysis.fireMetrics)
  const portM          = toObj(analysis.portfolioMetrics)

  const taxSaved    = toNum(impact.taxSaved) || toNum(metrics.taxSaved)
  const retReady    = toNum(impact.retirementReadiness) || toNum(metrics.retirementReadiness)
  const healthScore = toNum(metrics.healthScore)
  const xirr        = toNum(metrics.xirr) || toNum(portM.xirr)
  const taxRec      = toStr(taxResult.recommendation) || 'new'
  const taxSavings  = toNum(taxResult.savings)
  const oldTax      = toNum(oldRegime.tax)
  const newTax      = toNum(newRegime.tax)
  const now = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── Page dimensions ───────────────────────────────────────────────────────
  const W   = 210   // A4 width mm
  const M   = 14    // margin
  const CW  = W - M * 2  // content width = 182mm
  let   y   = 0

  // ── Color palette ─────────────────────────────────────────────────────────
  const GREEN:  RGB = [5, 150, 105]
  const DGREEN: RGB = [4, 110, 75]
  const BLUE:   RGB = [37, 99, 235]
  const AMBER:  RGB = [180, 100, 10]
  const RED:    RGB = [185, 28, 28]
  const DARK:   RGB = [17, 24, 39]
  const MID:    RGB = [75, 85, 99]
  const LIGHT:  RGB = [156, 163, 175]
  const BG:     RGB = [248, 250, 252]
  const WHITE:  RGB = [255, 255, 255]

  // ── Drawing helpers ───────────────────────────────────────────────────────
  const newPage = () => { doc.addPage(); y = M + 4 }
  const checkPage = (need: number) => { if (y + need > 278) newPage() }

  const setF = (size: number, bold: boolean, color: RGB = DARK) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...color)
  }

  const fillRect = (x: number, yy: number, w: number, h: number, c: RGB) => {
    doc.setFillColor(...c); doc.rect(x, yy, w, h, 'F')
  }

  const rRect = (x: number, yy: number, w: number, h: number, c: RGB) => {
    doc.setFillColor(...c); doc.roundedRect(x, yy, w, h, 2, 2, 'F')
  }

  // Wrap and print text, returns new Y position
  const wrapText = (text: string, x: number, yy: number, maxW: number, size: number, color: RGB = DARK): number => {
    setF(size, false, color)
    const lines = doc.splitTextToSize(text, maxW)
    doc.text(lines, x, yy)
    return yy + lines.length * (size * 0.38 + 1)
  }

  const sectionTitle = (title: string) => {
    checkPage(18)
    y += 5
    fillRect(M, y, 4, 8, GREEN)
    setF(10, true, DARK)
    doc.text(title, M + 7, y + 6)
    doc.setDrawColor(209, 250, 229); doc.setLineWidth(0.3)
    doc.line(M, y + 9, M + CW, y + 9)
    y += 14
  }

  // ════════════════════════════════════════════════════════════════
  // HEADER
  // ════════════════════════════════════════════════════════════════
  fillRect(0, 0, W, 46, GREEN)
  fillRect(0, 40, W, 6, DGREEN)

  doc.setFillColor(...WHITE)
  doc.circle(M + 9, 18, 8, 'F')
  setF(9, true, GREEN); doc.text('AI', M + 5.5, 21.5)

  setF(17, true, WHITE)
  doc.text('AI Money Mentor Report', M + 22, 16)
  setF(9, false, WHITE)
  doc.text('Prepared for ' + userName, M + 22, 23)
  setF(8, false, [200, 240, 220] as RGB)
  doc.text(now + '   |   7-Agent Autonomous Analysis', M + 22, 29)
  setF(7, false, [200, 240, 220] as RGB)
  const rid = toStr(report.reportId)
  doc.text('Report: ' + (rid ? rid.slice(0, 32) + '...' : 'N/A') + '   |   v' + (toNum(report.profileVersion) || 1), M, 42)

  y = 55

  // ── Impact metric cards ───────────────────────────────────────────────────
  const cw4 = (CW - 6) / 4
  const cards = [
    { label: 'HEALTH SCORE',     value: healthScore ? healthScore + '/100' : 'N/A', color: GREEN },
    { label: 'RETIREMENT READY', value: retReady    ? retReady + '%'       : 'N/A', color: BLUE  },
    { label: 'TAX SAVED',        value: taxSaved    ? inr(taxSaved)        : 'N/A', color: GREEN },
    { label: 'PORTFOLIO XIRR',   value: xirr        ? pct(xirr)            : 'N/A', color: AMBER },
  ]
  cards.forEach((c, i) => {
    const cx = M + i * (cw4 + 2)
    rRect(cx, y, cw4, 22, BG)
    fillRect(cx, y, 3, 22, c.color)
    setF(11, true, c.color)
    // Ensure value fits — truncate if needed
    const valLines = doc.splitTextToSize(c.value, cw4 - 6)
    doc.text(valLines[0] ?? c.value, cx + 5, y + 11)
    setF(6, false, LIGHT)
    doc.text(c.label, cx + 5, y + 18)
  })
  y += 28

  // ════════════════════════════════════════════════════════════════
  // STRATEGY SUMMARY
  // ════════════════════════════════════════════════════════════════
  if (strategy) {
    sectionTitle('STRATEGY SUMMARY')
    const lines = doc.splitTextToSize(strategy, CW - 8)
    const h = lines.length * 5.2 + 8
    checkPage(h + 4)
    rRect(M, y, CW, h, [240, 253, 244] as RGB)
    fillRect(M, y, 3, h, GREEN)
    setF(8.5, false, DARK)
    doc.text(lines, M + 6, y + 6)
    y += h + 6
  }

  // ════════════════════════════════════════════════════════════════
  // TAX COMPARISON
  // ════════════════════════════════════════════════════════════════
  if (oldTax > 0 || newTax > 0) {
    sectionTitle('TAX REGIME COMPARISON')
    checkPage(50)
    const hw = (CW - 6) / 2
    const regimes = [
      { label: 'Old Tax Regime', tax: oldTax, eff: toNum(oldRegime.effectiveRate), taxable: toNum(oldRegime.taxableIncome), rec: taxRec === 'old' },
      { label: 'New Tax Regime', tax: newTax, eff: toNum(newRegime.effectiveRate), taxable: toNum(newRegime.taxableIncome), rec: taxRec === 'new' },
    ]
    regimes.forEach((r, i) => {
      const rx = M + i * (hw + 6)
      rRect(rx, y, hw, 36, r.rec ? ([240, 253, 244] as RGB) : BG)
      if (r.rec) {
        doc.setDrawColor(...GREEN); doc.setLineWidth(0.7)
        doc.roundedRect(rx, y, hw, 36, 2, 2, 'S')
        fillRect(rx + hw - 32, y + 3, 29, 5.5, GREEN)
        setF(6, true, WHITE)
        doc.text('RECOMMENDED', rx + hw - 17.5, y + 7.2, { align: 'center' })
      }
      setF(7.5, true, r.rec ? GREEN : MID); doc.text(r.label.toUpperCase(), rx + 4, y + 8)
      setF(15, true, r.rec ? GREEN : DARK); doc.text(inr(r.tax), rx + 4, y + 21)
      setF(7.5, false, MID)
      doc.text('Taxable: ' + inr(r.taxable), rx + 4, y + 27)
      doc.text('Eff. Rate: ' + r.eff.toFixed(1) + '%', rx + 4, y + 33)
    })
    y += 40
    if (taxSavings > 0) {
      checkPage(12)
      rRect(M, y, CW, 10, [209, 250, 229] as RGB)
      setF(9, true, DGREEN)
      const savText = 'You save ' + inr(taxSavings) + ' by choosing the ' + taxRec.toUpperCase() + ' tax regime'
      doc.text(doc.splitTextToSize(savText, CW - 10)[0] ?? savText, M + CW / 2, y + 7, { align: 'center' })
      y += 14
    }
  }

  // ════════════════════════════════════════════════════════════════
  // TAX SUGGESTIONS
  // ════════════════════════════════════════════════════════════════
  if (taxSuggestions.length > 0) {
    sectionTitle('TAX SAVING SUGGESTIONS')
    taxSuggestions.forEach((tip, idx) => {
      const lines = doc.splitTextToSize(tip, CW - 14)
      const h = lines.length * 5.2 + 8
      checkPage(h + 4)
      rRect(M, y, CW, h, BG)
      setF(9, true, GREEN); doc.text(String(idx + 1), M + 4, y + 6.5)
      setF(8.5, false, DARK); doc.text(lines, M + 12, y + 6.5)
      y += h + 4
    })
    y += 2
  }

  // ════════════════════════════════════════════════════════════════
  // MISSED DEDUCTIONS
  // ════════════════════════════════════════════════════════════════
  if (missedDeducts.length > 0) {
    sectionTitle('MISSED DEDUCTIONS')
    missedDeducts.forEach(d => {
      const lim  = toNum(d.limit)
      const desc = toStr(d.description) + (lim > 0 ? '  (Max: ' + inr(lim) + ')' : '')
      const descLines = doc.splitTextToSize(desc, CW - 56)
      const h = Math.max(18, descLines.length * 5 + 12)
      checkPage(h + 4)
      rRect(M, y, CW, h, [255, 251, 235] as RGB)
      fillRect(M, y, 3, h, AMBER)
      setF(9, true, DARK)
      doc.text(toStr(d.section), M + 6, y + 7)
      setF(7.5, false, MID)
      doc.text(descLines, M + 6, y + 13)
      // Right side — saving amount aligned properly
      const savText = inr(toNum(d.saving))
      setF(10, true, GREEN)
      doc.text(savText, M + CW - 3, y + 9, { align: 'right' })
      setF(6.5, false, LIGHT)
      doc.text('potential saving', M + CW - 3, y + 14, { align: 'right' })
      y += h + 5
    })
  }

  // ════════════════════════════════════════════════════════════════
  // SIP PLAN
  // ════════════════════════════════════════════════════════════════
  if (sipPlan.length > 0) {
    sectionTitle('RECOMMENDED SIP PLAN')
    sipPlan.forEach(sp => {
      const name     = toStr(sp.instrument) || toStr(sp.category)
      const cat      = toStr(sp.category)
      const rat      = toStr(sp.rationale)
      const amount   = toNum(sp.amount)
      // Name wraps within left 60% of card
      const nameLines = doc.splitTextToSize(name, CW - 52)
      const ratLines  = rat ? doc.splitTextToSize(rat, CW - 52) : []
      const h = Math.max(18, nameLines.length * 5 + ratLines.length * 4.5 + 12)
      checkPage(h + 4)
      rRect(M, y, CW, h, BG)
      fillRect(M, y, 3, h, GREEN)
      setF(9, true, DARK)
      doc.text(nameLines, M + 6, y + 7)
      setF(7, false, MID)
      const catY = y + 7 + nameLines.length * 5
      doc.text('Category: ' + cat, M + 6, catY)
      if (ratLines.length > 0) {
        setF(7.5, false, MID)
        doc.text(ratLines, M + 6, catY + 5)
      }
      if (amount > 0) {
        setF(10, true, GREEN)
        doc.text(inr(amount) + '/mo', M + CW - 3, y + 10, { align: 'right' })
      }
      y += h + 4
    })
  }

  // ════════════════════════════════════════════════════════════════
  // ASSET ALLOCATION
  // ════════════════════════════════════════════════════════════════
  const allocEntries = Object.entries(assetAlloc).filter(([, v]) => toNum(v) > 0)
  if (allocEntries.length > 0) {
    sectionTitle('ASSET ALLOCATION')
    checkPage(32)
    const barColors: RGB[] = [GREEN, BLUE, AMBER, MID, [124, 58, 237] as RGB]
    let xb = M
    allocEntries.forEach(([, v], i) => {
      const bw = (toNum(v) / 100) * CW
      fillRect(xb, y, bw, 12, barColors[i % barColors.length])
      if (bw > 16) {
        setF(8, true, WHITE)
        doc.text(toNum(v) + '%', xb + bw / 2, y + 8.5, { align: 'center' })
      }
      xb += bw
    })
    y += 16
    let xl = M
    allocEntries.forEach(([k, v], i) => {
      fillRect(xl, y, 5, 5, barColors[i % barColors.length])
      setF(8, false, DARK)
      doc.text(k.charAt(0).toUpperCase() + k.slice(1) + ': ' + toNum(v) + '%', xl + 7, y + 4)
      xl += 46
      if (xl > M + CW - 46) { xl = M; y += 8 }
    })
    y += 10
  }

  // ════════════════════════════════════════════════════════════════
  // ACTION PLAN
  // ════════════════════════════════════════════════════════════════
  if (actionItems.length > 0) {
    sectionTitle('ACTION PLAN')
    const priColor: Record<string, RGB> = { high: RED, medium: AMBER, low: GREEN }
    const priBg: Record<string, RGB>    = {
      high:   [254, 242, 242],
      medium: [255, 251, 235],
      low:    [240, 253, 244],
    }
    actionItems.forEach(item => {
      const pri   = toStr(item.priority).toLowerCase() || 'medium'
      const act   = toStr(item.action)
      const time  = toStr(item.timeline)
      const col   = priColor[pri] ?? MID
      const bg    = priBg[pri]    ?? BG
      // Wrap action text within the available width (excluding badge space)
      const actLines = doc.splitTextToSize(act, CW - 32)
      const timeLines = time ? doc.splitTextToSize('Timeline: ' + time, CW - 32) : []
      const h = Math.max(16, actLines.length * 5.2 + timeLines.length * 4.5 + 8)
      checkPage(h + 4)
      rRect(M, y, CW, h, bg)
      fillRect(M, y, 3, h, col)
      // Priority badge
      fillRect(M + 5, y + (h / 2) - 3, 20, 6, col)
      setF(6, true, WHITE)
      doc.text(pri.toUpperCase(), M + 15, y + (h / 2) + 1, { align: 'center' })
      // Action text — starts after badge column
      setF(8.5, true, DARK)
      doc.text(actLines, M + 28, y + 7)
      if (timeLines.length > 0) {
        setF(7, false, LIGHT)
        doc.text(timeLines, M + 28, y + 7 + actLines.length * 5.2)
      }
      y += h + 4
    })
  }

  // ════════════════════════════════════════════════════════════════
  // KEY INSIGHTS
  // ════════════════════════════════════════════════════════════════
  if (insights.length > 0) {
    sectionTitle('KEY INSIGHTS')
    insights.forEach((ins, idx) => {
      const lines = doc.splitTextToSize(ins, CW - 16)
      const h = lines.length * 5.2 + 8
      checkPage(h + 4)
      rRect(M, y, CW, h, [239, 246, 255] as RGB)
      fillRect(M, y, 3, h, BLUE)
      setF(9, true, BLUE); doc.text(String(idx + 1), M + 6, y + 7)
      setF(8.5, false, DARK); doc.text(lines, M + 14, y + 7)
      y += h + 4
    })
  }

  // ════════════════════════════════════════════════════════════════
  // FIRE METRICS
  // ════════════════════════════════════════════════════════════════
  const reqSIP = toNum(fireM.requiredSIP)
  const corpus = toNum(fireM.retirementCorpusNeeded)
  if (reqSIP > 0 || corpus > 0) {
    sectionTitle('FIRE PLAN METRICS')
    checkPage(32)
    const fcw = (CW - 6) / 2
    const fireItems: Array<{ label: string; value: string; color: RGB }> = [
      { label: 'Monthly SIP Required',    value: inr(reqSIP),  color: GREEN },
      { label: 'Retirement Corpus Needed', value: inr(corpus),  color: BLUE  },
      { label: 'Years to Retirement',      value: toNum(fireM.yearsToRetirement) + ' yrs', color: AMBER },
      { label: 'Savings Rate',             value: pct(fireM.savingsRate), color: GREEN },
    ]
    fireItems.forEach((fi, i) => {
      const fx = M + (i % 2) * (fcw + 6)
      if (i === 2) { y += 26; checkPage(30) }
      rRect(fx, y, fcw, 22, BG)
      fillRect(fx, y, 3, 22, fi.color)
      setF(11, true, fi.color)
      const vLines = doc.splitTextToSize(fi.value, fcw - 8)
      doc.text(vLines[0] ?? fi.value, fx + 6, y + 13)
      setF(6.5, false, LIGHT)
      doc.text(fi.label.toUpperCase(), fx + 6, y + 19)
    })
    y += 28
  }

  // ════════════════════════════════════════════════════════════════
  // PORTFOLIO ANALYSIS
  // ════════════════════════════════════════════════════════════════
  const totalInv = toNum(portM.totalInvested)
  const totalCur = toNum(portM.totalCurrentValue)
  if (totalInv > 0) {
    sectionTitle('PORTFOLIO ANALYSIS')
    const rows = [
      { label: 'Total Invested',    value: inr(totalInv), color: DARK },
      { label: 'Current Value',     value: inr(totalCur), color: totalCur >= totalInv ? GREEN : RED },
      { label: 'Absolute Returns',  value: totalInv > 0 ? ((totalCur - totalInv) / totalInv * 100).toFixed(2) + '%' : 'N/A', color: totalCur >= totalInv ? GREEN : RED },
      { label: 'XIRR (Annualised)', value: xirr ? pct(xirr) : 'N/A', color: xirr >= 12 ? GREEN : AMBER },
      { label: 'Avg Expense Ratio', value: toNum(portM.averageExpenseRatio).toFixed(2) + '%', color: DARK },
    ]
    rows.forEach(r => {
      checkPage(8)
      setF(8.5, false, MID); doc.text(r.label, M, y)
      setF(8.5, true, r.color); doc.text(r.value, M + CW, y, { align: 'right' })
      doc.setDrawColor(240, 242, 244); doc.setLineWidth(0.2)
      doc.line(M, y + 2.5, M + CW, y + 2.5)
      y += 7
    })
    y += 4
  }

  // ════════════════════════════════════════════════════════════════
  // REBALANCING PLAN
  // ════════════════════════════════════════════════════════════════
  if (rebalancePlan.length > 0) {
    sectionTitle('PORTFOLIO REBALANCING')
    rebalancePlan.forEach(rb => {
      const act      = toStr(rb.action).toUpperCase()
      const fund     = toStr(rb.fund)
      const reason   = toStr(rb.reason)
      const actLower = act.toLowerCase()
      const col      = ['SELL', 'REDUCE'].includes(act) ? RED : act === 'HOLD' ? BLUE : GREEN
      const fundLines   = doc.splitTextToSize(fund, CW - 32)
      const reasonLines = doc.splitTextToSize(reason, CW - 32)
      const h = Math.max(16, (fundLines.length + reasonLines.length) * 5 + 10)
      checkPage(h + 4)
      rRect(M, y, CW, h, BG)
      fillRect(M, y, 3, h, col)
      fillRect(M + 5, y + 4, 22, 6, col)
      setF(6, true, WHITE); doc.text(act.slice(0, 10), M + 16, y + 8.5, { align: 'center' })
      setF(8.5, true, DARK); doc.text(fundLines, M + 30, y + 7)
      setF(7.5, false, MID); doc.text(reasonLines, M + 30, y + 7 + fundLines.length * 5)
      y += h + 4
    })
  }

  // ════════════════════════════════════════════════════════════════
  // WHY THIS RECOMMENDATION
  // ════════════════════════════════════════════════════════════════
  if (explainability) {
    sectionTitle('WHY THIS RECOMMENDATION?')
    const lines = doc.splitTextToSize(explainability, CW - 8)
    const h = lines.length * 5.2 + 8
    checkPage(h + 4)
    rRect(M, y, CW, h, [239, 246, 255] as RGB)
    fillRect(M, y, 3, h, BLUE)
    setF(8.5, false, DARK); doc.text(lines, M + 6, y + 6.5)
    y += h + 6
  }

  // ════════════════════════════════════════════════════════════════
  // SEBI DISCLAIMER
  // ════════════════════════════════════════════════════════════════
  const disc = 'SEBI DISCLAIMER: This report is AI-generated for educational purposes only. It does not constitute SEBI-registered investment advice or certified financial planning. Mutual fund investments are subject to market risks. Past performance is not indicative of future results. Consult a SEBI-registered investment advisor before making investment decisions.'
  const discLines = doc.splitTextToSize(disc, CW - 8)
  const discH = discLines.length * 5 + 12
  checkPage(discH + 8)
  y += 4
  doc.setFillColor(255, 251, 235)
  doc.setDrawColor(253, 211, 77); doc.setLineWidth(0.5)
  doc.roundedRect(M, y, CW, discH, 2, 2, 'FD')
  setF(8, true, AMBER); doc.text('SEBI DISCLAIMER', M + 5, y + 7)
  setF(7.5, false, [120, 80, 10] as RGB); doc.text(discLines, M + 5, y + 13)

  // ════════════════════════════════════════════════════════════════
  // FOOTER ON EVERY PAGE
  // ════════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    fillRect(0, 287, W, 10, BG)
    doc.setDrawColor(220, 225, 230); doc.setLineWidth(0.3)
    doc.line(0, 287, W, 287)
    setF(7, false, LIGHT)
    doc.text('AI Money Mentor  |  7-Agent Autonomous Financial Analysis', M, 293)
    setF(7, true, MID)
    doc.text('Page ' + p + ' of ' + totalPages, W - M, 293, { align: 'right' })
  }

  // ── Download ──────────────────────────────────────────────────────────────
  const date = new Date().toISOString().split('T')[0]
  const type = toStr(report.type) || 'report'
  doc.save('money-mentor-' + type + '-' + date + '.pdf')
}