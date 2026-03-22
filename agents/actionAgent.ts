import Anthropic from '@anthropic-ai/sdk'
import { UserMemory } from '@/types/agents'
import {
  taxCalculatorIndia,
  computeRiskScore,
  calculateRequiredSIP,
} from '@/tools/financialTools'

export interface NextBestAction {
  action: string
  impact: string
  priority: 'high' | 'medium' | 'low'
  reason: string
  category: 'sip' | 'tax' | 'insurance' | 'portfolio' | 'debt' | 'goal' | 'general'
  estimatedValue?: number
  dataPointsUsed: string[]
  confidenceScore: number
}

export interface ActionAgentInput {
  monthlyIncome: number
  monthlyExpenses: number
  savings: number
  emergencyFundMonths: number
  hasTermInsurance: boolean
  hasHealthInsurance: boolean
  totalDebt: number
  monthlyEMI: number
  investmentAmount: number
  section80C: number
  age: number
  riskProfile: string
  retirementAge: number
  memory?: UserMemory | null
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ─── Deterministic rules first, Claude for reasoning ──────────────────────
export async function getNextBestAction(
  input: ActionAgentInput
): Promise<NextBestAction> {
  const dataPoints: string[] = []
  let deterministicAction: Partial<NextBestAction> | null = null

  // Rule 1: Emergency fund missing (highest priority)
  if (input.emergencyFundMonths < 3) {
    const target = input.monthlyExpenses * 6
    const needed = target - input.savings
    dataPoints.push(`Emergency fund: ${input.emergencyFundMonths} months (need 6)`)
    deterministicAction = {
      category: 'general',
      priority: 'high',
      estimatedValue: needed,
      dataPointsUsed: dataPoints,
    }
  }

  // Rule 2: No term insurance
  else if (!input.hasTermInsurance && input.monthlyIncome > 0) {
    const coverNeeded = input.monthlyIncome * 12 * 15
    dataPoints.push(`No term insurance`, `Annual income: ₹${input.monthlyIncome * 12}`)
    deterministicAction = {
      category: 'insurance',
      priority: 'high',
      estimatedValue: coverNeeded,
      dataPointsUsed: dataPoints,
    }
  }

  // Rule 3: 80C not maxed
  else if (input.section80C < 150000 && input.monthlyIncome > 25000) {
    const gap = 150000 - input.section80C
    const taxSaving = gap * 0.3 // assuming 30% slab
    dataPoints.push(`80C utilized: ₹${input.section80C} of ₹1,50,000`)
    deterministicAction = {
      category: 'tax',
      priority: 'high',
      estimatedValue: taxSaving,
      dataPointsUsed: dataPoints,
    }
  }

  // Rule 4: High debt-to-income
  else if (input.monthlyEMI / Math.max(1, input.monthlyIncome) > 0.4) {
    dataPoints.push(`EMI: ₹${input.monthlyEMI}/mo (${Math.round(input.monthlyEMI/input.monthlyIncome*100)}% of income)`)
    deterministicAction = {
      category: 'debt',
      priority: 'high',
      dataPointsUsed: dataPoints,
    }
  }

  // Rule 5: Under-investing
  else if (input.investmentAmount / Math.max(1, input.monthlyIncome) < 0.2) {
    const recommended = Math.round(input.monthlyIncome * 0.3)
    const gap = recommended - input.investmentAmount
    dataPoints.push(`Investment rate: ${Math.round(input.investmentAmount/input.monthlyIncome*100)}% (recommend 30%)`)
    deterministicAction = {
      category: 'sip',
      priority: 'medium',
      estimatedValue: gap,
      dataPointsUsed: dataPoints,
    }
  }

  // Use Claude to generate the human-readable action + reason
  const systemPrompt = `You are an Indian financial advisor. Generate a single, specific "Next Best Action" in JSON format.
The action should be highly specific with exact amounts in INR.
Respond ONLY with valid JSON, no markdown.`

  const userPrompt = `Based on this financial profile, generate the single most impactful next action:

Monthly Income: ₹${input.monthlyIncome}
Monthly Expenses: ₹${input.monthlyExpenses}
Savings: ₹${input.savings}
Emergency Fund: ${input.emergencyFundMonths} months
Term Insurance: ${input.hasTermInsurance ? 'Yes' : 'No'}
Health Insurance: ${input.hasHealthInsurance ? 'Yes' : 'No'}
Total Debt: ₹${input.totalDebt}
Monthly EMI: ₹${input.monthlyEMI}
Monthly Investments: ₹${input.investmentAmount}
80C Invested: ₹${input.section80C}
Age: ${input.age}
Risk Profile: ${input.riskProfile}
Retirement Age: ${input.retirementAge}

${deterministicAction ? `Detected issue: ${JSON.stringify(deterministicAction)}` : ''}
${input.memory?.behaviorPatterns?.ignoredAdvice?.length ? `Previously ignored: ${input.memory.behaviorPatterns.ignoredAdvice.join(', ')}` : ''}

Return JSON:
{
  "action": "specific action with exact amount/step",
  "impact": "exact financial impact e.g. Save ₹18,000 tax this year",
  "priority": "high|medium|low",
  "reason": "2 sentence explanation using actual numbers from their profile",
  "category": "sip|tax|insurance|portfolio|debt|goal|general",
  "estimatedValue": number
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // Use Haiku for speed/cost
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = (response.content[0] as Anthropic.TextBlock).text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')

    const parsed = JSON.parse(jsonMatch[0])
    return {
      action: parsed.action ?? 'Review your financial plan',
      impact: parsed.impact ?? 'Improve financial health',
      priority: parsed.priority ?? 'medium',
      reason: parsed.reason ?? '',
      category: parsed.category ?? 'general',
      estimatedValue: parsed.estimatedValue ?? deterministicAction?.estimatedValue,
      dataPointsUsed: [...dataPoints, ...(parsed.dataPointsUsed ?? [])],
      confidenceScore: deterministicAction ? 90 : 75,
    }
  } catch {
    // Fallback to deterministic
    return {
      action: getDefaultAction(input, deterministicAction),
      impact: deterministicAction?.estimatedValue
        ? `Potential benefit: ₹${deterministicAction.estimatedValue.toLocaleString('en-IN')}`
        : 'Improve your financial health',
      priority: deterministicAction?.priority ?? 'medium',
      reason: 'Based on analysis of your financial profile.',
      category: deterministicAction?.category ?? 'general',
      estimatedValue: deterministicAction?.estimatedValue,
      dataPointsUsed: dataPoints,
      confidenceScore: 65,
    }
  }
}

function getDefaultAction(
  input: ActionAgentInput,
  det: Partial<NextBestAction> | null
): string {
  if (!input.hasTermInsurance) return 'Buy term life insurance of ₹1 Cr cover today'
  if (input.emergencyFundMonths < 3) return `Build emergency fund of ₹${(input.monthlyExpenses * 6).toLocaleString('en-IN')} in liquid FD`
  if (input.section80C < 150000) return `Invest ₹${(150000 - input.section80C).toLocaleString('en-IN')} in ELSS to max 80C and save tax`
  if (input.investmentAmount < input.monthlyIncome * 0.2) return `Increase SIP by ₹${Math.round(input.monthlyIncome * 0.1).toLocaleString('en-IN')} per month`
  return 'Review and rebalance your portfolio allocation'
}

// ─── Confidence Score based on data completeness ──────────────────────────
export function calculateConfidenceScore(input: Partial<ActionAgentInput>): {
  score: number
  missingFields: string[]
  suggestions: string[]
} {
  const fields: Array<{ key: keyof ActionAgentInput; label: string; weight: number }> = [
    { key: 'monthlyIncome',      label: 'Monthly Income',        weight: 15 },
    { key: 'monthlyExpenses',    label: 'Monthly Expenses',      weight: 12 },
    { key: 'age',                label: 'Age',                   weight: 10 },
    { key: 'savings',            label: 'Savings Amount',        weight: 10 },
    { key: 'hasTermInsurance',   label: 'Insurance status',      weight: 10 },
    { key: 'emergencyFundMonths',label: 'Emergency fund months', weight: 8  },
    { key: 'section80C',         label: '80C investments',       weight: 8  },
    { key: 'investmentAmount',   label: 'Monthly investments',   weight: 8  },
    { key: 'totalDebt',          label: 'Total debt',            weight: 7  },
    { key: 'retirementAge',      label: 'Retirement age goal',   weight: 7  },
    { key: 'riskProfile',        label: 'Risk profile',          weight: 5  },
  ]

  const missing: string[] = []
  let score = 0

  for (const f of fields) {
    const val = input[f.key]
    if (val !== undefined && val !== null && val !== '' && val !== 0) {
      score += f.weight
    } else {
      missing.push(f.label)
    }
  }

  return {
    score: Math.min(100, score),
    missingFields: missing,
    suggestions: missing.slice(0, 3).map(m => `Add your ${m} to improve analysis accuracy`),
  }
}