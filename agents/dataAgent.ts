import { AgentContext, AgentResult, PortfolioFund } from '@/types/agents'
import { getMutualFundNAV, getAllNAVs } from '@/tools/financialTools'
import { parsePDF } from '@/lib/parsePDF.server'

export interface DataAgentOutput {
  portfolioFunds?: PortfolioFund[]
  taxData?: Record<string, number>
  pdfText?: string
  navMap?: Map<string, { nav: number; date: string }>
  missingFields?: string[]
  dataQuality: 'complete' | 'partial' | 'insufficient'
}

// ─── Data Agent ───────────────────────────────────────────────────────────
// Fetches & validates data from external sources.
// Returns dataQuality so orchestrator can decide to retry or ask user.

export async function dataAgent(
  ctx: AgentContext
): Promise<AgentResult<DataAgentOutput>> {
  const input = ctx.userInput
  const output: DataAgentOutput = { dataQuality: 'complete' }
  const missingFields: string[] = []

  try {
    // ── Portfolio task: enrich funds with live NAV ──
    if (ctx.taskType === 'portfolio_xray') {
      const funds = input.funds as PortfolioFund[] | undefined

      if (!funds || funds.length === 0) {
        return {
          success: false,
          error: 'No funds provided',
          retryable: false,
          nextAgent: undefined,
        }
      }

      // Fetch full NAV list once
      const navMap = await getAllNAVs()
      const enrichedFunds: PortfolioFund[] = []

      for (const fund of funds) {
        const navKey = fund.name.toLowerCase()
        const navData = navMap.get(navKey)
        enrichedFunds.push({
          ...fund,
          nav: navData?.nav ?? fund.nav,
          nav_data: navData
            ? { schemeCode: '', schemeName: fund.name, nav: navData.nav, date: navData.date }
            : undefined,
        })
      }

      // Build simplified navMap for output
      const simpleNavMap = new Map<string, { nav: number; date: string }>()
      navMap.forEach((v, k) => simpleNavMap.set(k, { nav: v.nav, date: v.date }))

      output.portfolioFunds = enrichedFunds
      output.navMap = simpleNavMap
    }

    // ── PDF parsing task (Tax Wizard / Portfolio) ──
    if (input.pdfBuffer) {
      try {
        const buf = Buffer.from(input.pdfBuffer as string, 'base64')
        const text = await parsePDF(buf)
        output.pdfText = text

        // Attempt to extract Form 16 fields from text
        if (ctx.taskType === 'tax_wizard') {
          output.taxData = extractTaxDataFromPDF(text)
        }
      } catch (err) {
        // PDF parse failed — fallback to manual data
        if (String(err).includes('PDF_PARSE_FAILED')) {
          output.pdfText = undefined
          missingFields.push('pdf_content')
        }
      }
    }

    // ── Validate required fields per task ──
    const required = getRequiredFields(ctx.taskType)
    for (const field of required) {
      if (input[field] === undefined || input[field] === null || input[field] === '') {
        missingFields.push(field)
      }
    }

    output.missingFields = missingFields
    output.dataQuality =
      missingFields.length === 0 ? 'complete' :
      missingFields.length <= 2 ? 'partial' : 'insufficient'

    return {
      success: true,
      data: output,
      nextAgent: output.dataQuality === 'insufficient' ? undefined : 'analysis',
    }
  } catch (err) {
    return { success: false, error: String(err), retryable: true }
  }
}

// ─── PDF text extraction for Form 16 ──────────────────────────────────────
function extractTaxDataFromPDF(text: string): Record<string, number> {
  const data: Record<string, number> = {}
  const patterns: Array<[string, RegExp]> = [
    ['basicSalary', /basic\s*salary[:\s₹]+([0-9,]+)/i],
    ['hra', /hra|house\s*rent\s*allowance[:\s₹]+([0-9,]+)/i],
    ['grossSalary', /gross\s*salary[:\s₹]+([0-9,]+)/i],
    ['section80C', /80\s*c[:\s₹]+([0-9,]+)/i],
    ['section80D', /80\s*d[:\s₹]+([0-9,]+)/i],
    ['netTaxable', /net\s*taxable[:\s₹]+([0-9,]+)/i],
    ['tdsDeducted', /tds[:\s₹]+([0-9,]+)/i],
  ]

  for (const [key, pattern] of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      data[key] = parseInt(match[1].replace(/,/g, ''), 10)
    }
  }

  return data
}

// ─── Required fields per task ──────────────────────────────────────────────
function getRequiredFields(taskType: string): string[] {
  const map: Record<string, string[]> = {
    fire_plan: ['age', 'monthlyIncome', 'monthlyExpenses', 'retirementAge'],
    money_health: ['monthlyIncome', 'monthlyExpenses', 'age'],
    tax_wizard: ['basicSalary'],
    life_event: ['event', 'currentAge', 'monthlyIncome'],
    couples_plan: ['partner1', 'partner2'],
    portfolio_xray: ['funds'],
    chat: ['message'],
  }
  return map[taskType] ?? []
}
