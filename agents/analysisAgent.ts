import { AgentContext, AgentResult, PortfolioFund } from '@/types/agents'
import {
  calculateXIRR, taxCalculatorIndia, portfolioOverlapAnalyzer,
  calculateRetirementCorpus, calculateRequiredSIP, computeRiskScore,
  TaxResult, OverlapResult,
} from '@/tools/financialTools'
import { DataAgentOutput } from './dataAgent'

export interface AnalysisOutput {
  // FIRE
  fireMetrics?: {
    yearsToRetirement: number
    monthlySurplus: number
    requiredSIP: number
    projectedCorpus: number
    retirementCorpusNeeded: number
    savingsRate: number
    projections: Array<{ year: number; corpus: number }>
  }
  // Money Health
  healthMetrics?: {
    emergencyFundRatio: number
    debtToIncome: number
    savingsRate: number
    investmentRate: number
    insuranceCoverage: boolean
    section80CUtilization: number
  }
  // Tax
  taxResult?: TaxResult
  // Portfolio
  portfolioMetrics?: {
    totalInvested: number
    totalCurrentValue: number
    absoluteReturn: number
    returnPct: number
    xirr: number
    overlap: OverlapResult
    categoryBreakdown: Record<string, number>
    averageExpenseRatio: number
  }
  // Risk
  riskProfile?: {
    score: number
    level: 'low' | 'medium' | 'high'
    flags: string[]
  }
}

// ─── Analysis Agent ────────────────────────────────────────────────────────
// Pure deterministic. Uses tools, not LLM.

export async function analysisAgent(
  ctx: AgentContext,
  dataOutput: DataAgentOutput
): Promise<AgentResult<AnalysisOutput>> {
  try {
    const input = ctx.userInput
    const output: AnalysisOutput = {}

    // ── FIRE Analysis ──
    if (ctx.taskType === 'fire_plan') {
      const age = Number(input.age)
      const retAge = Number(input.retirementAge ?? 60)
      const income = Number(input.monthlyIncome)
      const expenses = Number(input.monthlyExpenses)
      const currentInvestments = Number(input.currentInvestments ?? 0)
      const yearsToRetirement = retAge - age

      const monthlySurplus = income - expenses
      const savingsRate = income > 0 ? (monthlySurplus / income) * 100 : 0

      const retirementCorpusNeeded = calculateRetirementCorpus(expenses)
      const requiredSIP = calculateRequiredSIP(
        Math.max(0, retirementCorpusNeeded - currentInvestments),
        12, // 12% equity return assumption
        yearsToRetirement
      )

      // 10 projection points
      const projections = Array.from({ length: 10 }, (_, i) => {
        const yr = age + Math.round((yearsToRetirement / 10) * (i + 1))
        const n = Math.round((yearsToRetirement / 10) * (i + 1))
        const r = 0.12 / 12
        const months = n * 12
        const sipCorpus = requiredSIP * ((Math.pow(1 + r, months) - 1) / r) * (1 + r)
        const lumpGrowth = currentInvestments * Math.pow(1.12, n)
        return { year: yr, corpus: Math.round(sipCorpus + lumpGrowth) }
      })

      output.fireMetrics = {
        yearsToRetirement,
        monthlySurplus,
        requiredSIP: Math.round(requiredSIP),
        projectedCorpus: Math.round(projections[projections.length - 1]?.corpus ?? 0),
        retirementCorpusNeeded: Math.round(retirementCorpusNeeded),
        savingsRate: Math.round(savingsRate),
        projections,
      }
    }

    // ── Money Health Analysis ──
    if (ctx.taskType === 'money_health') {
      const income = Number(input.monthlyIncome)
      const expenses = Number(input.monthlyExpenses)
      const savings = Number(input.savings ?? 0)
      const totalDebt = Number(input.totalDebt ?? 0)
      const monthlyEMI = Number(input.monthlyEMI ?? 0)
      const investmentAmount = Number(input.investmentAmount ?? 0)
      const section80C = Number(input.section80CInvested ?? 0)

      output.healthMetrics = {
        emergencyFundRatio: income > 0 ? savings / (expenses * 6) : 0,
        debtToIncome: income > 0 ? monthlyEMI / income : 0,
        savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
        investmentRate: income > 0 ? (investmentAmount / income) * 100 : 0,
        insuranceCoverage: Boolean(input.hasTermInsurance && input.hasHealthInsurance),
        section80CUtilization: (section80C / 150000) * 100,
      }

      output.riskProfile = computeRiskScore({
        debtToIncome: monthlyEMI / Math.max(1, income),
        emergencyMonths: Number(input.emergencyFundMonths ?? 0),
        insuranceCoverage: Boolean(input.hasTermInsurance),
        equityPct: 60, // default assumption
        age: Number(input.age ?? 30),
      })
    }

    // ── Tax Analysis ──
    if (ctx.taskType === 'tax_wizard') {
      const taxData = dataOutput.taxData ?? {}
      output.taxResult = taxCalculatorIndia({
        basicSalary: Number(input.basicSalary ?? taxData.basicSalary ?? 0),
        hra: Number(input.hra ?? taxData.hra ?? 0),
        specialAllowance: Number(input.specialAllowance ?? 0),
        otherIncome: Number(input.otherIncome ?? 0),
        rentPaid: Number(input.rentPaid ?? 0),
        isMetro: input.cityType === 'metro',
        section80C: Number(input.section80C ?? 0),
        section80D: Number(input.section80D ?? 0),
        nps: Number(input.npsContribution ?? 0),
        homeLoanInterest: Number(input.homeLoanInterest ?? 0),
        otherDeductions: Number(input.otherDeductions ?? 0),
      })
    }

    // ── Portfolio Analysis ──
    if (ctx.taskType === 'portfolio_xray') {
      const funds = (dataOutput.portfolioFunds ?? input.funds as PortfolioFund[]) || []
      const totalInvested = funds.reduce((s, f) => s + f.investedAmount, 0)
      const totalCurrentValue = funds.reduce((s, f) => s + f.currentValue, 0)
      const absoluteReturn = totalCurrentValue - totalInvested
      const returnPct = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0

      // XIRR — approximate using monthly SIP assumption
      const now = new Date()
      const horizon = Number(input.investmentHorizon ?? 5)
      const cashflows = [
        { date: new Date(now.getFullYear() - horizon, now.getMonth(), 1), amount: -totalInvested },
        { date: now, amount: totalCurrentValue },
      ]
      const xirr = calculateXIRR(cashflows)

      const overlap = portfolioOverlapAnalyzer(funds)
      const totalValue = totalCurrentValue || 1
      const catBreakdown: Record<string, number> = {}
      for (const f of funds) {
        catBreakdown[f.category] = (catBreakdown[f.category] ?? 0) + f.currentValue
      }
      for (const k of Object.keys(catBreakdown)) {
        catBreakdown[k] = Math.round((catBreakdown[k] / totalValue) * 100)
      }
      const avgER = funds.length > 0
        ? funds.reduce((s, f) => s + (f.expenseRatio ?? 1), 0) / funds.length
        : 0

      output.portfolioMetrics = {
        totalInvested,
        totalCurrentValue,
        absoluteReturn,
        returnPct: Math.round(returnPct * 100) / 100,
        xirr: Math.round(xirr * 100) / 100,
        overlap,
        categoryBreakdown: catBreakdown,
        averageExpenseRatio: Math.round(avgER * 100) / 100,
      }

      output.riskProfile = computeRiskScore({
        debtToIncome: 0,
        emergencyMonths: 6,
        insuranceCoverage: true,
        equityPct: catBreakdown['Large Cap'] ?? 60,
        age: Number(input.age ?? 35),
      })
    }

    return { success: true, data: output, nextAgent: 'planning' }
  } catch (err) {
    return { success: false, error: String(err), retryable: true }
  }
}
