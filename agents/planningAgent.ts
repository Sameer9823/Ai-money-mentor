import Anthropic from '@anthropic-ai/sdk'
import { AgentContext, AgentResult, UserMemory } from '@/types/agents'
import { AnalysisOutput } from './analysisAgent'
import { adaptStrategyFromMemory } from './memoryAgent'
import { formatCurrency } from '@/tools/financialTools'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface PlanningOutput {
  strategy: string
  sipPlan?: Array<{ category: string; amount: number; instrument: string; rationale: string }>
  assetAllocation?: { equity: number; debt: number; gold: number; cash: number }
  insights: string[]
  actionItems: Array<{ priority: 'high' | 'medium' | 'low'; action: string; timeline: string }>
  taxSuggestions?: string[]
  rebalancingPlan?: Array<{ fund: string; action: string; reason: string }>
  missedDeductions?: Array<{ section: string; limit: number; description: string; saving: number }>
  impactMetrics: {
    taxSaved?: number
    portfolioImprovement?: number
    retirementReadiness?: number
    netWorthGrowth?: number
  }
  explainability: string // "Why this recommendation?"
}

// ─── Planning Agent ────────────────────────────────────────────────────────
// Uses Claude for reasoning. Gets structured analysis as context.
// Memory adaptations are injected into the prompt.

export async function planningAgent(
  ctx: AgentContext,
  analysis: AnalysisOutput,
  memory: UserMemory | null
): Promise<AgentResult<PlanningOutput>> {
  try {
    const adaptations = adaptStrategyFromMemory(memory, ctx.taskType)
    const prompt = buildPrompt(ctx, analysis, adaptations, memory)

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (response.content[0] as Anthropic.TextBlock).text

    // Robust extraction — find first { ... } block
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { success: false, error: 'JSON_PARSE_FAILED', retryable: true }
    }

    let parsed: PlanningOutput
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      // Second attempt: strip control characters and retry
      const cleaned = jsonMatch[0]
        .replace(/[\x00-\x1F\x7F]/g, ' ')  // remove control chars
        .replace(/,\s*}/g, '}')             // trailing commas
        .replace(/,\s*]/g, ']')
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        return { success: false, error: 'JSON_PARSE_FAILED', retryable: true }
      }
    }

    // Ensure required fields have defaults so nothing is undefined
    parsed.strategy = parsed.strategy ?? 'Financial plan generated.'
    parsed.insights = parsed.insights ?? []
    parsed.actionItems = parsed.actionItems ?? []
    parsed.impactMetrics = parsed.impactMetrics ?? {
      taxSaved: 0, portfolioImprovement: 0,
      retirementReadiness: 0, netWorthGrowth: 0,
    }
    parsed.explainability = parsed.explainability ?? 'This recommendation is for educational purposes only. Not SEBI-registered advice.'

    return { success: true, data: parsed, nextAgent: 'risk' }
  } catch (err) {
    return { success: false, error: String(err), retryable: true }
  }
}

// ─── Prompt builder ────────────────────────────────────────────────────────
function buildPrompt(
  ctx: AgentContext,
  analysis: AnalysisOutput,
  adaptations: Record<string, unknown>,
  memory: UserMemory | null
): string {
  const input = ctx.userInput

  const memoryContext = memory ? `
MEMORY CONTEXT:
- Past behavior: ${memory.behaviorPatterns.ignoredAdvice.length > 0 ? 'User has ignored: ' + memory.behaviorPatterns.ignoredAdvice.join(', ') : 'No ignored advice'}
- Completed actions: ${memory.behaviorPatterns.completedActions.join(', ') || 'None'}
- Engagement score: ${memory.behaviorPatterns.engagementScore}/100
${adaptations.sipAdjustment ? '- Strategy note: ' + adaptations.sipAdjustment : ''}
${adaptations.previousPlan ? '- Previous FIRE plan SIP: ₹' + (adaptations.previousPlan as Record<string, unknown>).monthlySIP : ''}
` : ''

  const analysisContext = JSON.stringify(analysis, null, 2)

  const taskPrompts: Record<string, string> = {
    fire_plan: `
USER PROFILE:
- Age: ${input.age}, Target retirement: ${input.retirementAge}
- Monthly Income: ${formatCurrency(Number(input.monthlyIncome))}, Expenses: ${formatCurrency(Number(input.monthlyExpenses))}
- Current Investments: ${formatCurrency(Number(input.currentInvestments ?? 0))}
- Goals: ${Array.isArray(input.goals) ? input.goals.join(', ') : input.goals}

COMPUTED METRICS:
${analysisContext}
${memoryContext}

Generate a FIRE plan with: SIP breakdown by category, asset allocation, monthly action plan, 5 key insights. Show impact metrics.`,

    money_health: `
USER PROFILE: Age ${input.age}, Income ${formatCurrency(Number(input.monthlyIncome))}/mo
COMPUTED HEALTH METRICS:
${analysisContext}
${memoryContext}

Score health across 6 dimensions (emergency/insurance/investments/debt/tax/retirement). Each out of max points. List top 3 corrective actions.`,

    tax_wizard: `
TAX COMPUTED RESULTS:
${analysisContext}
${memoryContext}

Provide: Which regime to pick and why. Every missed deduction the user can still claim. 5 tax-saving suggestions with amounts. Explain in plain English.`,

    life_event: `
LIFE EVENT: ${input.event}
Amount: ${formatCurrency(Number(input.amount ?? 0))}
Age: ${input.currentAge}, Income: ${formatCurrency(Number(input.monthlyIncome))}/mo
Risk: ${input.riskProfile}
${memoryContext}

Create step-by-step investment strategy, tax strategy, risk management, and 3-month action timeline.`,

    couples_plan: `
PARTNER 1: ${(input.partner1 as Record<string, unknown>)?.name}, Income ${formatCurrency(Number((input.partner1 as Record<string, unknown>)?.income ?? 0))} p.a.
PARTNER 2: ${(input.partner2 as Record<string, unknown>)?.name}, Income ${formatCurrency(Number((input.partner2 as Record<string, unknown>)?.income ?? 0))} p.a.
Monthly Rent: ${formatCurrency(Number(input.monthlyRent ?? 0))}
Goals: ${Array.isArray(input.goals) ? input.goals.join(', ') : input.goals}
${memoryContext}

Optimize HRA (who claims), SIP split between partners, tax-efficient investment allocation, combined insurance, joint goal funding.`,

    portfolio_xray: `
PORTFOLIO ANALYSIS:
${analysisContext}
${memoryContext}

Provide: Rebalancing plan per fund (sell/reduce/hold/increase), redundant funds to consolidate, new category suggestions, expense optimization.`,

    chat: `
USER MESSAGE: ${input.message}
USER CONTEXT: ${JSON.stringify({ age: memory?.profile?.age, income: memory?.profile?.monthlyIncome })}
PAST HEALTH SCORE: ${memory?.financialHistory?.healthScore ?? 'Unknown'}

Answer the financial question. Be specific with Indian instruments and amounts.`,
  }

  return taskPrompts[ctx.taskType] ?? `Task: ${ctx.taskType}\nInput: ${JSON.stringify(input)}`
}

// ─── System prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior Indian financial advisor AI.

CRITICAL: Your response must be ONLY a valid JSON object. 
- No markdown code blocks
- No backticks  
- No text before or after the JSON
- Start your response with { and end with }

Rules for the JSON content:
- Use ₹ symbol in string values for amounts
- Reference Indian instruments: SIP, ELSS, PPF, NPS, SGB
- All number fields must be plain numbers (no currency symbols)
- null is allowed for unused fields

Required JSON structure:
{
  "strategy": "2-3 sentence summary string",
  "sipPlan": [{"category": "string", "amount": 5000, "instrument": "string", "rationale": "string"}],
  "assetAllocation": {"equity": 60, "debt": 30, "gold": 5, "cash": 5},
  "insights": ["string1", "string2", "string3"],
  "actionItems": [{"priority": "high", "action": "string", "timeline": "string"}],
  "taxSuggestions": ["string"],
  "rebalancingPlan": [{"fund": "string", "action": "string", "reason": "string"}],
  "missedDeductions": [{"section": "string", "limit": 150000, "description": "string", "saving": 5000}],
  "impactMetrics": {"taxSaved": 0, "portfolioImprovement": 0, "retirementReadiness": 0, "netWorthGrowth": 0},
  "explainability": "string with reasoning and SEBI disclaimer"
}`
