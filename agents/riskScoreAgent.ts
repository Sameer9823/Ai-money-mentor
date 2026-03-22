import { computeRiskScore } from '@/tools/financialTools'

export interface RiskBreakdown {
  equityRisk:      { score: number; label: string; detail: string }
  debtRisk:        { score: number; label: string; detail: string }
  insuranceGap:    { score: number; label: string; detail: string }
  emergencyRisk:   { score: number; label: string; detail: string }
  concentrationRisk: { score: number; label: string; detail: string }
  ageRisk:         { score: number; label: string; detail: string }
}

export interface RiskScoreOutput {
  riskScore: number          // 0-100, higher = more risky
  category: 'Low' | 'Medium' | 'High' | 'Very High'
  breakdown: RiskBreakdown
  heatmapData: Array<{ label: string; value: number; color: string }>
  topRisks: string[]
  mitigationSteps: string[]
}

export interface RiskScoreInput {
  age: number
  monthlyIncome: number
  monthlyEMI: number
  totalDebt: number
  hasTermInsurance: boolean
  hasHealthInsurance: boolean
  healthCover: number
  emergencyFundMonths: number
  equityAllocationPct: number   // % of portfolio in equity
  largestFundPct: number        // concentration: largest fund as % of portfolio
  investmentAmount: number
}

function riskLabel(score: number): string {
  if (score <= 25)  return 'Low'
  if (score <= 50)  return 'Moderate'
  if (score <= 75)  return 'High'
  return 'Very High'
}

function riskColor(score: number): string {
  if (score <= 25)  return '#10b981'  // green
  if (score <= 50)  return '#f59e0b'  // amber
  if (score <= 75)  return '#f97316'  // orange
  return '#ef4444'                     // red
}

export function calculateRiskScore(input: RiskScoreInput): RiskScoreOutput {
  // ── 1. Equity Risk (0-20) ─────────────────────────────────────────
  const maxEquity = Math.max(20, 100 - input.age)  // thumb rule
  const equityOverage = Math.max(0, input.equityAllocationPct - maxEquity)
  const equityScore = Math.min(20, Math.round((equityOverage / 20) * 20))
  const equityBreakdown = {
    score: equityScore,
    label: riskLabel(equityScore * 5),
    detail: `${input.equityAllocationPct}% equity (max recommended ${maxEquity}% for age ${input.age})`,
  }

  // ── 2. Debt Risk (0-20) ──────────────────────────────────────────
  const debtToIncome = input.monthlyEMI / Math.max(1, input.monthlyIncome)
  const debtScore = Math.min(20, Math.round(debtToIncome * 40))
  const debtBreakdown = {
    score: debtScore,
    label: riskLabel(debtScore * 5),
    detail: `EMI is ${Math.round(debtToIncome * 100)}% of monthly income (safe limit: 40%)`,
  }

  // ── 3. Insurance Gap (0-20) ──────────────────────────────────────
  let insuranceScore = 0
  if (!input.hasTermInsurance)   insuranceScore += 12
  if (!input.hasHealthInsurance) insuranceScore += 8
  else if (input.healthCover < 500000) insuranceScore += 4
  const insuranceBreakdown = {
    score: Math.min(20, insuranceScore),
    label: riskLabel(insuranceScore * 5),
    detail: !input.hasTermInsurance
      ? 'No term insurance — family financially unprotected'
      : !input.hasHealthInsurance
      ? 'No health insurance — medical emergency risk'
      : `Health cover ₹${(input.healthCover/100000).toFixed(1)}L (recommend ₹10L+)`,
  }

  // ── 4. Emergency Fund Risk (0-15) ────────────────────────────────
  const emergScore = input.emergencyFundMonths >= 6 ? 0
    : input.emergencyFundMonths >= 3 ? 7
    : input.emergencyFundMonths >= 1 ? 11
    : 15
  const emergencyBreakdown = {
    score: emergScore,
    label: riskLabel(emergScore * 6.67),
    detail: `${input.emergencyFundMonths} months emergency fund (need 6 months minimum)`,
  }

  // ── 5. Concentration Risk (0-15) ────────────────────────────────
  const concScore = input.largestFundPct > 60 ? 15
    : input.largestFundPct > 40 ? 9
    : input.largestFundPct > 25 ? 4
    : 0
  const concentrationBreakdown = {
    score: concScore,
    label: riskLabel(concScore * 6.67),
    detail: `Largest single fund is ${input.largestFundPct}% of portfolio (safe: <25%)`,
  }

  // ── 6. Age vs Retirement Risk (0-10) ────────────────────────────
  const yearsToRetire = Math.max(0, 60 - input.age)
  const investRate = input.investmentAmount / Math.max(1, input.monthlyIncome)
  const ageScore = yearsToRetire < 10 && investRate < 0.3 ? 10
    : yearsToRetire < 20 && investRate < 0.2 ? 6
    : investRate < 0.1 ? 4
    : 0
  const ageBreakdown = {
    score: ageScore,
    label: riskLabel(ageScore * 10),
    detail: `${yearsToRetire} years to retirement, investing ${Math.round(investRate * 100)}% of income`,
  }

  // ── Total Score ──────────────────────────────────────────────────
  const totalRisk = equityScore + debtScore + insuranceBreakdown.score +
    emergScore + concScore + ageScore

  const maxRisk = 100
  const riskScore = Math.round((totalRisk / maxRisk) * 100)

  const category: RiskScoreOutput['category'] =
    riskScore <= 25 ? 'Low' :
    riskScore <= 50 ? 'Medium' :
    riskScore <= 75 ? 'High' : 'Very High'

  // ── Heatmap data ─────────────────────────────────────────────────
  const heatmapData = [
    { label: 'Equity Exposure',   value: equityScore * 5,        color: riskColor(equityScore * 5)        },
    { label: 'Debt Burden',       value: debtScore * 5,          color: riskColor(debtScore * 5)          },
    { label: 'Insurance Gap',     value: insuranceBreakdown.score * 5, color: riskColor(insuranceBreakdown.score * 5) },
    { label: 'Emergency Fund',    value: emergScore * 6.67,      color: riskColor(emergScore * 6.67)      },
    { label: 'Concentration',     value: concScore * 6.67,       color: riskColor(concScore * 6.67)       },
    { label: 'Retirement Gap',    value: ageScore * 10,          color: riskColor(ageScore * 10)          },
  ]

  // ── Top risks ────────────────────────────────────────────────────
  const allRisks = [
    { label: 'Get term insurance immediately', score: insuranceBreakdown.score },
    { label: 'Build 6-month emergency fund', score: emergScore },
    { label: 'Reduce EMI burden', score: debtScore },
    { label: 'Rebalance equity allocation', score: equityScore },
    { label: 'Diversify portfolio concentration', score: concScore },
    { label: 'Increase retirement savings rate', score: ageScore },
  ].filter(r => r.score > 0).sort((a, b) => b.score - a.score)

  return {
    riskScore,
    category,
    breakdown: {
      equityRisk: equityBreakdown,
      debtRisk: debtBreakdown,
      insuranceGap: insuranceBreakdown,
      emergencyRisk: emergencyBreakdown,
      concentrationRisk: concentrationBreakdown,
      ageRisk: ageBreakdown,
    },
    heatmapData,
    topRisks: allRisks.slice(0, 3).map(r => r.label),
    mitigationSteps: allRisks.slice(0, 3).map(r => r.label),
  }
}