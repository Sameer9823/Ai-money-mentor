/**
 * EXPLAINABILITY LAYER
 * Every AI recommendation is wrapped with:
 * - What data points were used
 * - Why this specific recommendation
 * - Confidence level
 * - Alternative options considered
 */

export interface ExplainedOutput<T = unknown> {
  recommendation: T
  explanation: string
  dataPointsUsed: Array<{ field: string; value: string; impact: string }>
  confidenceScore: number        // 0-100
  alternativesConsidered: string[]
  sebiDisclaimer: string
  generatedAt: string
}

const SEBI_DISCLAIMER =
  'This analysis is AI-generated for educational purposes only and does not constitute ' +
  'SEBI-registered investment advice. Consult a SEBI-registered financial advisor before ' +
  'making investment decisions.'

// Wrap any output with explainability metadata
export function withExplainability<T>(
  recommendation: T,
  context: {
    explanation: string
    dataPoints: Array<{ field: string; value: string; impact: string }>
    confidence: number
    alternatives?: string[]
  }
): ExplainedOutput<T> {
  return {
    recommendation,
    explanation: context.explanation,
    dataPointsUsed: context.dataPoints,
    confidenceScore: context.confidence,
    alternativesConsidered: context.alternatives ?? [],
    sebiDisclaimer: SEBI_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  }
}

// Build explanation for FIRE plan
export function explainFirePlan(input: {
  age: number
  income: number
  expenses: number
  retirementAge: number
  requiredSIP: number
  corpus: number
}): ExplainedOutput<null> {
  const yearsLeft = input.retirementAge - input.age
  const savingsRate = ((input.income - input.expenses) / input.income * 100).toFixed(0)

  return withExplainability(null, {
    explanation: `Because your monthly surplus is ₹${(input.income - input.expenses).toLocaleString('en-IN')} (${savingsRate}% savings rate) and you have ${yearsLeft} years to retirement at age ${input.retirementAge}, you need ₹${input.requiredSIP.toLocaleString('en-IN')}/month SIP at 12% CAGR to build a corpus of ₹${(input.corpus / 10000000).toFixed(2)} Cr — enough to fund your retirement expenses adjusted for 6% inflation.`,
    dataPoints: [
      { field: 'Age',            value: `${input.age} years`,           impact: `${yearsLeft} years of compounding available` },
      { field: 'Monthly Income', value: `₹${input.income.toLocaleString('en-IN')}`, impact: 'Determines investable surplus' },
      { field: 'Monthly Expenses', value: `₹${input.expenses.toLocaleString('en-IN')}`, impact: 'Determines retirement corpus needed' },
      { field: 'Retirement Age', value: `${input.retirementAge} years`, impact: `${yearsLeft} year investment horizon` },
      { field: 'Assumed Equity Return', value: '12% CAGR',              impact: 'Long-term Nifty 50 average' },
      { field: 'Inflation Rate',  value: '6%',                          impact: 'Used to calculate real corpus needed' },
    ],
    confidence: 78,
    alternatives: [
      `Retire at ${input.retirementAge + 5} — reduces SIP by ~30%`,
      'Invest in real estate alongside MF for diversification',
      'Consider NPS for additional tax-free retirement corpus',
    ],
  })
}

// Build explanation for tax recommendation
export function explainTaxRecommendation(input: {
  recommendation: 'old' | 'new'
  oldTax: number
  newTax: number
  savings: number
  totalDeductions: number
  grossIncome: number
}): ExplainedOutput<null> {
  const deductionPct = (input.totalDeductions / input.grossIncome * 100).toFixed(1)

  return withExplainability(null, {
    explanation: `${input.recommendation === 'old' ? 'Old' : 'New'} regime saves ₹${input.savings.toLocaleString('en-IN')} because your total deductions of ₹${input.totalDeductions.toLocaleString('en-IN')} (${deductionPct}% of gross income) ${input.recommendation === 'old' ? 'exceed' : 'are less than'} the breakeven threshold where old regime becomes ${input.recommendation === 'old' ? 'cheaper' : 'more expensive'}.`,
    dataPoints: [
      { field: 'Gross Income',       value: `₹${input.grossIncome.toLocaleString('en-IN')} p.a.`,   impact: 'Determines tax slab' },
      { field: 'Total Deductions',   value: `₹${input.totalDeductions.toLocaleString('en-IN')}`,    impact: `Reduces old regime taxable income by ${deductionPct}%` },
      { field: 'Old Regime Tax',     value: `₹${input.oldTax.toLocaleString('en-IN')}`,             impact: 'After all deductions and 87A rebate' },
      { field: 'New Regime Tax',     value: `₹${input.newTax.toLocaleString('en-IN')}`,             impact: 'With ₹75,000 standard deduction only' },
      { field: 'Annual Saving',      value: `₹${input.savings.toLocaleString('en-IN')}`,            impact: 'By choosing recommended regime' },
    ],
    confidence: 96, // Tax is deterministic
    alternatives: [
      `If you invest ₹50,000 more in NPS, old regime saves ${input.recommendation === 'new' ? 'even more' : 'an additional ₹10,400'}`,
      'Maximizing 80D to ₹75,000 (senior citizen parents) saves additional ₹23,400',
    ],
  })
}

// Build explanation for portfolio recommendation
export function explainPortfolioRecommendation(input: {
  xirr: number
  benchmarkReturn: number
  overlapScore: number
  expenseDrag: number
  diversificationScore: number
}): ExplainedOutput<null> {
  const vsMarket = input.xirr - input.benchmarkReturn

  return withExplainability(null, {
    explanation: `Your portfolio XIRR of ${input.xirr.toFixed(1)}% is ${Math.abs(vsMarket).toFixed(1)}% ${vsMarket >= 0 ? 'above' : 'below'} NIFTY 50. The overlap score of ${input.overlapScore}/100 indicates ${input.overlapScore > 50 ? 'high' : 'moderate'} fund duplication, and expense ratio drag of ${input.expenseDrag}%/year is ${input.expenseDrag > 1 ? 'above' : 'within'} optimal range.`,
    dataPoints: [
      { field: 'Portfolio XIRR',       value: `${input.xirr.toFixed(1)}%`,           impact: `${vsMarket >= 0 ? '+' : ''}${vsMarket.toFixed(1)}% vs NIFTY 50` },
      { field: 'Fund Overlap Score',   value: `${input.overlapScore}/100`,            impact: input.overlapScore > 50 ? 'High overlap reduces diversification' : 'Acceptable diversification' },
      { field: 'Expense Ratio Drag',   value: `${input.expenseDrag}%/year`,           impact: 'Compounding cost over 10 years is significant' },
      { field: 'Diversification',      value: `${input.diversificationScore}/100`,    impact: 'Higher = better risk-adjusted returns' },
    ],
    confidence: 82,
    alternatives: [
      'Switch to 100% index funds for market-matching returns at minimal cost',
      'Add international fund for geographic diversification',
    ],
  })
}