'use client'
import { formatCurrency } from '@/tools/financialTools'

interface ReportData {
  reportId?: string
  profileVersion?: number
  type?: string
  title?: string
  metrics?: Record<string, number>
  outputs?: {
    plan?: {
      strategy?: string
      sipPlan?: Array<{ instrument: string; category: string; amount: number; rationale: string }>
      assetAllocation?: Record<string, number>
      actionItems?: Array<{ priority: string; action: string; timeline: string }>
      taxSuggestions?: string[]
      insights?: string[]
      missedDeductions?: Array<{ section: string; limit: number; description: string; saving: number }>
      explainability?: string
    }
    analysis?: {
      taxResult?: {
        recommendation: string
        savings: number
        oldRegime: { taxableIncome: number; tax: number; effectiveRate: number }
        newRegime: { taxableIncome: number; tax: number; effectiveRate: number }
      }
      fireMetrics?: {
        requiredSIP: number
        retirementCorpusNeeded: number
        yearsToRetirement: number
        savingsRate: number
      }
      portfolioMetrics?: {
        xirr: number
        totalInvested: number
        totalCurrentValue: number
        averageExpenseRatio: number
      }
    }
    impactDashboard?: {
      taxSaved: number
      retirementReadiness: number
      portfolioImprovement: number
      netWorthGrowth: number
    }
  }
}

export async function generateAndDownloadPDF(
  reportData: ReportData | null,
  userName: string
) {
  // Dynamic import so jsPDF is never bundled server-side
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210   // A4 width mm
  const MARGIN = 16
  const CONTENT_W = W - MARGIN * 2
  let y = 0

  // ── Color palette ──────────────────────────────────────────────────────
  const GREEN  = [5, 150, 105]   as [number, number, number]
  const DKGREEN= [4, 120, 87]    as [number, number, number]
  const GRAY   = [107, 114, 128] as [number, number, number]
  const DKGRAY = [31, 41, 55]    as [number, number, number]
  const LTGRAY = [249, 250, 251] as [number, number, number]
  const WHITE  = [255, 255, 255] as [number, number, number]
  const RED    = [220, 38, 38]   as [number, number, number]
  const AMBER  = [217, 119, 6]   as [number, number, number]
  const BLUE   = [59, 130, 246]  as [number, number, number]

  const now = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })

  const plan = reportData?.outputs?.plan
  const analysis = reportData?.outputs?.analysis
  const impact = reportData?.outputs?.impactDashboard
  const metrics = reportData?.metrics ?? {}

  // ── Helper: new page check ─────────────────────────────────────────────
  function checkPage(neededMM: number) {
    if (y + neededMM > 272) {
      doc.addPage()
      y = MARGIN
    }
  }

  // ── Helper: section header ─────────────────────────────────────────────
  function sectionHeader(title: string) {
    checkPage(14)
    doc.setFillColor(...GREEN)
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(title, MARGIN + 4, y + 5.5)
    y += 11
    doc.setTextColor(...DKGRAY)
  }

  // ── Helper: metric card ────────────────────────────────────────────────
  function metricCard(x: number, yPos: number, w: number, label: string, value: string, color: [number,number,number] = GREEN) {
    doc.setFillColor(...LTGRAY)
    doc.roundedRect(x, yPos, w, 20, 2, 2, 'F')
    doc.setDrawColor(...color)
    doc.setLineWidth(0.5)
    doc.rect(x, yPos, 1.5, 20, 'F')
    doc.setFillColor(...color)
    doc.rect(x, yPos, 1.5, 20, 'F')
    doc.setTextColor(...color)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(value, x + 5, yPos + 11)
    doc.setTextColor(...GRAY)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(label.toUpperCase(), x + 5, yPos + 16)
  }

  // ── Helper: divider ────────────────────────────────────────────────────
  function divider() {
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
    y += 4
  }

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 1 — HEADER
  // ══════════════════════════════════════════════════════════════════════
  // Green gradient header
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, W, 50, 'F')
  doc.setFillColor(...DKGREEN)
  doc.rect(0, 40, W, 10, 'F')

  // Logo circle
  doc.setFillColor(...WHITE)
  doc.circle(MARGIN + 8, 18, 8, 'F')
  doc.setTextColor(...GREEN)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('₹', MARGIN + 5, 22)

  // Title
  doc.setTextColor(...WHITE)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('AI Money Mentor Report', MARGIN + 22, 18)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Prepared for ${userName}  ·  ${now}`, MARGIN + 22, 25)

  doc.setFontSize(7.5)
  doc.setFillColor(255, 255, 255, 0.2)
  doc.text('7-Agent Autonomous Analysis  ·  SEBI Educational Disclaimer Applies', MARGIN + 22, 32)

  // Report meta
  doc.setFontSize(7)
  doc.setTextColor(209, 250, 229)
  doc.text(`Report ID: ${reportData?.reportId ?? 'Preview'}  ·  Profile v${reportData?.profileVersion ?? 1}`, MARGIN, 44)

  y = 58

  // ── Impact metrics row ──────────────────────────────────────────────
  const cardW = (CONTENT_W - 9) / 4
  const cards = [
    { label: 'Health Score', value: metrics.healthScore ? `${metrics.healthScore}/100` : '—', color: GREEN },
    { label: 'Retirement Ready', value: `${impact?.retirementReadiness ?? metrics.retirementReadiness ?? 0}%`, color: BLUE },
    { label: 'Tax Saved', value: impact?.taxSaved ? formatCurrency(impact.taxSaved) : '—', color: GREEN },
    { label: 'Portfolio XIRR', value: metrics.xirr ? `${metrics.xirr}%` : analysis?.portfolioMetrics?.xirr ? `${analysis.portfolioMetrics.xirr}%` : '—', color: AMBER },
  ]
  cards.forEach((c, i) => metricCard(MARGIN + i * (cardW + 3), y, cardW, c.label, c.value, c.color as [number,number,number]))
  y += 26

  // ── Strategy summary ──────────────────────────────────────────────────
  if (plan?.strategy) {
    sectionHeader('🎯  STRATEGY SUMMARY')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DKGRAY)
    const lines = doc.splitTextToSize(plan.strategy, CONTENT_W)
    checkPage(lines.length * 5 + 4)
    doc.text(lines, MARGIN, y)
    y += lines.length * 5 + 6
  }

  // ── SIP Plan ──────────────────────────────────────────────────────────
  if (plan?.sipPlan?.length) {
    sectionHeader('📈  RECOMMENDED SIP PLAN')
    for (const s of plan.sipPlan) {
      checkPage(14)
      doc.setFillColor(...LTGRAY)
      doc.roundedRect(MARGIN, y, CONTENT_W, 11, 1, 1, 'F')
      doc.setTextColor(...DKGRAY)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(s.instrument, MARGIN + 3, y + 5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY)
      doc.setFontSize(7.5)
      doc.text(`${s.category}  ·  ${s.rationale}`, MARGIN + 3, y + 9)
      doc.setTextColor(...GREEN)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`${formatCurrency(s.amount)}/mo`, MARGIN + CONTENT_W - 3, y + 7, { align: 'right' })
      y += 13
    }
    y += 2
  }

  // ── Asset Allocation ──────────────────────────────────────────────────
  if (plan?.assetAllocation) {
    sectionHeader('⚖️  ASSET ALLOCATION')
    const alloc = plan.assetAllocation
    const barW = CONTENT_W
    const entries = Object.entries(alloc).filter(([, v]) => Number(v) > 0)
    const colors: [number,number,number][] = [GREEN, BLUE, AMBER, GRAY]
    let xBar = MARGIN

    // Bar chart
    for (let i = 0; i < entries.length; i++) {
      const [, val] = entries[i]
      const segW = (Number(val) / 100) * barW
      doc.setFillColor(...colors[i % colors.length])
      doc.rect(xBar, y, segW, 8, 'F')
      xBar += segW
    }
    y += 10

    // Legend
    xBar = MARGIN
    doc.setFontSize(8)
    for (let i = 0; i < entries.length; i++) {
      const [key, val] = entries[i]
      doc.setFillColor(...colors[i % colors.length])
      doc.rect(xBar, y, 4, 4, 'F')
      doc.setTextColor(...DKGRAY)
      doc.setFont('helvetica', 'normal')
      doc.text(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${val}%`, xBar + 6, y + 3.5)
      xBar += 45
    }
    y += 10
  }

  // ── Tax Analysis ──────────────────────────────────────────────────────
  if (analysis?.taxResult) {
    const tax = analysis.taxResult
    sectionHeader('🧾  TAX REGIME COMPARISON')

    const halfW = (CONTENT_W - 6) / 2
    const regimes = [
      { label: 'Old Regime', data: tax.oldRegime, rec: tax.recommendation === 'old' },
      { label: 'New Regime', data: tax.newRegime, rec: tax.recommendation === 'new' },
    ]

    for (let i = 0; i < 2; i++) {
      const rx = MARGIN + i * (halfW + 6)
      const { label, data, rec } = regimes[i]
      doc.setFillColor(rec ? 240 : 249, rec ? 253 : 250, rec ? 244 : 251)
      doc.roundedRect(rx, y, halfW, 28, 2, 2, 'F')
      if (rec) {
        doc.setDrawColor(...GREEN)
        doc.setLineWidth(0.6)
        doc.roundedRect(rx, y, halfW, 28, 2, 2, 'S')
      }
      doc.setTextColor(...GRAY)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.text(label.toUpperCase(), rx + 4, y + 6)
      if (rec) {
        doc.setFillColor(...GREEN)
        doc.roundedRect(rx + halfW - 28, y + 2, 26, 5, 2, 2, 'F')
        doc.setTextColor(...WHITE)
        doc.setFontSize(6)
        doc.text('RECOMMENDED', rx + halfW - 27, y + 5.5)
      }
      doc.setTextColor(...DKGRAY)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`₹${data.tax.toLocaleString('en-IN')}`, rx + 4, y + 17)
      doc.setTextColor(...GRAY)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.text(`Effective Rate: ${data.effectiveRate.toFixed(1)}%`, rx + 4, y + 23)
    }
    y += 32

    if (tax.savings > 0) {
      doc.setFillColor(209, 250, 229)
      doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1, 1, 'F')
      doc.setTextColor(...DKGREEN)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(`✓ You save ${formatCurrency(tax.savings)} by choosing the ${tax.recommendation} regime`, MARGIN + 4, y + 5.5)
      y += 12
    }
  }

  // ── Tax Suggestions ───────────────────────────────────────────────────
  if (plan?.taxSuggestions?.length) {
    sectionHeader('💡  TAX SAVING SUGGESTIONS')
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    for (const s of plan.taxSuggestions) {
      checkPage(10)
      doc.setTextColor(...GREEN)
      doc.text('•', MARGIN + 2, y)
      doc.setTextColor(...DKGRAY)
      const lines = doc.splitTextToSize(s, CONTENT_W - 8)
      doc.text(lines, MARGIN + 7, y)
      y += lines.length * 5 + 3
    }
    y += 2
  }

  // ── Missed Deductions ─────────────────────────────────────────────────
  if (plan?.missedDeductions?.length) {
    sectionHeader('⚠️  MISSED DEDUCTIONS')
    for (const d of plan.missedDeductions) {
      checkPage(14)
      doc.setFillColor(255, 251, 235)
      doc.roundedRect(MARGIN, y, CONTENT_W, 11, 1, 1, 'F')
      doc.setTextColor(...DKGRAY)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.text(d.section, MARGIN + 3, y + 5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY)
      doc.setFontSize(7.5)
      doc.text(d.description, MARGIN + 3, y + 9)
      doc.setTextColor(...GREEN)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(`Save ${formatCurrency(d.saving)}`, MARGIN + CONTENT_W - 3, y + 7, { align: 'right' })
      y += 13
    }
    y += 2
  }

  // ── Action Plan ───────────────────────────────────────────────────────
  if (plan?.actionItems?.length) {
    sectionHeader('⚡  ACTION PLAN')
    const priorityColor: Record<string, [number,number,number]> = {
      high: RED, medium: AMBER, low: GREEN,
    }
    for (const a of plan.actionItems) {
      checkPage(16)
      const col = priorityColor[a.priority] ?? GRAY
      doc.setFillColor(...LTGRAY)
      doc.roundedRect(MARGIN, y, CONTENT_W, 13, 1, 1, 'F')
      // Priority badge
      doc.setFillColor(...col)
      doc.roundedRect(MARGIN + 2, y + 3, 16, 5, 1, 1, 'F')
      doc.setTextColor(...WHITE)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.text(a.priority.toUpperCase(), MARGIN + 10, y + 6.5, { align: 'center' })
      // Action text
      doc.setTextColor(...DKGRAY)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(a.action, CONTENT_W - 25)
      doc.text(lines[0], MARGIN + 21, y + 5.5)
      doc.setTextColor(...GRAY)
      doc.setFontSize(7)
      doc.text(a.timeline, MARGIN + 21, y + 10)
      y += 15
    }
    y += 2
  }

  // ── Key Insights ──────────────────────────────────────────────────────
  if (plan?.insights?.length) {
    sectionHeader('🔍  KEY INSIGHTS')
    doc.setFontSize(8.5)
    for (let i = 0; i < plan.insights.length; i++) {
      checkPage(14)
      doc.setFillColor(239, 246, 255)
      const lines = doc.splitTextToSize(plan.insights[i], CONTENT_W - 12)
      const h = lines.length * 5 + 6
      doc.roundedRect(MARGIN, y, CONTENT_W, h, 1, 1, 'F')
      doc.setFillColor(...BLUE)
      doc.rect(MARGIN, y, 1.5, h, 'F')
      doc.setTextColor(...BLUE)
      doc.setFont('helvetica', 'bold')
      doc.text(`${i + 1}.`, MARGIN + 4, y + 5.5)
      doc.setTextColor(...DKGRAY)
      doc.setFont('helvetica', 'normal')
      doc.text(lines, MARGIN + 10, y + 5.5)
      y += h + 4
    }
  }

  // ── FIRE Metrics ──────────────────────────────────────────────────────
  if (analysis?.fireMetrics) {
    const fm = analysis.fireMetrics
    sectionHeader('🔥  FIRE PLAN METRICS')
    const fireCards = [
      { label: 'Monthly SIP Required', value: formatCurrency(fm.requiredSIP) },
      { label: 'Retirement Corpus Needed', value: formatCurrency(fm.retirementCorpusNeeded) },
      { label: 'Years to Retirement', value: `${fm.yearsToRetirement} yrs` },
      { label: 'Savings Rate', value: `${fm.savingsRate}%` },
    ]
    const fcW = (CONTENT_W - 9) / 4
    fireCards.forEach((c, i) => metricCard(MARGIN + i * (fcW + 3), y, fcW, c.label, c.value, GREEN))
    y += 26
  }

  // ── Explainability ────────────────────────────────────────────────────
  if (plan?.explainability) {
    checkPage(30)
    sectionHeader('📋  WHY THIS RECOMMENDATION?')
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DKGRAY)
    const lines = doc.splitTextToSize(plan.explainability, CONTENT_W)
    checkPage(lines.length * 5 + 4)
    doc.text(lines, MARGIN, y)
    y += lines.length * 5 + 6
  }

  // ── SEBI Disclaimer ───────────────────────────────────────────────────
  checkPage(24)
  doc.setFillColor(255, 251, 235)
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 2, 2, 'F')
  doc.setDrawColor(252, 211, 77)
  doc.setLineWidth(0.4)
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 2, 2, 'S')
  doc.setTextColor(146, 64, 14)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('⚠ SEBI DISCLAIMER', MARGIN + 4, y + 6)
  doc.setFont('helvetica', 'normal')
  const disc = 'This report is generated by AI for educational purposes only. It does not constitute SEBI-registered investment advice, portfolio management, or financial planning services. Past performance is not indicative of future results. Please consult a SEBI-registered investment advisor, certified financial planner, or tax consultant before making any financial decisions.'
  const discLines = doc.splitTextToSize(disc, CONTENT_W - 8)
  doc.text(discLines, MARGIN + 4, y + 11)
  y += 26

  // ── Footer on every page ───────────────────────────────────────────────
const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFillColor(...LTGRAY)
    doc.rect(0, 287, W, 10, 'F')
    doc.setTextColor(...GRAY)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('AI Money Mentor · 7-Agent Autonomous Financial Analysis System', MARGIN, 293)
    doc.text(`Page ${p} of ${totalPages}`, W - MARGIN, 293, { align: 'right' })
  }

  // ── Save ───────────────────────────────────────────────────────────────
  const filename = `money-mentor-${reportData?.type ?? 'report'}-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}