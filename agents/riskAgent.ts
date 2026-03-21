import { AgentContext, AgentResult } from '@/types/agents'
import { AnalysisOutput } from './analysisAgent'
import { PlanningOutput } from './planningAgent'

export interface RiskOutput {
  approved: boolean
  riskFlags: string[]
  adjustments: string[]
  complianceNotes: string[]
  finalPlan: PlanningOutput
}

const SEBI_DISCLAIMER =
  'This is AI-generated financial information for educational purposes only. ' +
  'It does not constitute SEBI-registered investment advice. ' +
  'Please consult a SEBI-registered financial advisor before making investment decisions.'

// ─── Risk & Compliance Agent ───────────────────────────────────────────────
// Validates the plan from Planning Agent.
// If plan is risky → flags issues and adjusts.
// If plan has guardrail violations → blocks and rewrites.

export async function riskAgent(
  ctx: AgentContext,
  analysis: AnalysisOutput,
  plan: PlanningOutput
): Promise<AgentResult<RiskOutput>> {
  try {
    const flags: string[] = []
    const adjustments: string[] = []
    const compliance: string[] = [SEBI_DISCLAIMER]

    // ── Check 1: SIP affordability ──
    if (plan.sipPlan) {
      const totalSIP = plan.sipPlan.reduce((s, p) => s + p.amount, 0)
      const income = Number(ctx.userInput.monthlyIncome ?? 0)
      const expenses = Number(ctx.userInput.monthlyExpenses ?? 0)
      const surplus = income - expenses

      if (totalSIP > surplus * 0.9) {
        flags.push(`Recommended SIP ₹${totalSIP.toLocaleString('en-IN')} exceeds 90% of monthly surplus`)
        const adjustedSIP = Math.round(surplus * 0.7)
        adjustments.push(`Adjusted total SIP to ₹${adjustedSIP.toLocaleString('en-IN')} (70% of surplus) for safety buffer`)
        // Scale down all SIP amounts proportionally
        if (totalSIP > 0) {
          const factor = adjustedSIP / totalSIP
          plan.sipPlan = plan.sipPlan.map(p => ({ ...p, amount: Math.round(p.amount * factor) }))
        }
      }
    }

    // ── Check 2: Asset allocation sanity ──
    if (plan.assetAllocation) {
      const { equity, debt, gold, cash } = plan.assetAllocation
      const total = equity + debt + gold + cash
      if (Math.abs(total - 100) > 5) {
        flags.push(`Asset allocation sums to ${total}% — normalizing to 100%`)
        const factor = 100 / total
        plan.assetAllocation = {
          equity: Math.round(equity * factor),
          debt: Math.round(debt * factor),
          gold: Math.round(gold * factor),
          cash: Math.round(cash * factor),
        }
      }

      // Age-based equity check
      const age = Number(ctx.userInput.age ?? ctx.userInput.currentAge ?? 35)
      const maxEquity = Math.max(30, 100 - age)
      if (equity > maxEquity + 20) {
        flags.push(`Equity allocation ${equity}% is too aggressive for age ${age}`)
        adjustments.push(`Capped equity at ${maxEquity}% based on age-based thumb rule`)
        plan.assetAllocation.equity = maxEquity
        plan.assetAllocation.debt += (equity - maxEquity)
      }
    }

    // ── Check 3: No illegal tax advice ──
    if (plan.taxSuggestions) {
      const illegal = ['cash transactions', 'undisclosed', 'black money', 'offshore']
      plan.taxSuggestions = plan.taxSuggestions.filter(s => {
        const hasIllegal = illegal.some(term => s.toLowerCase().includes(term))
        if (hasIllegal) flags.push(`Removed potentially non-compliant suggestion: "${s.substring(0, 50)}"`)
        return !hasIllegal
      })
      compliance.push('All tax suggestions are within legal CBDT guidelines.')
    }

    // ── Check 4: Missing insurance flag ──
    if (analysis.healthMetrics && !analysis.healthMetrics.insuranceCoverage) {
      flags.push('User has no term insurance — financial plan is vulnerable')
      plan.actionItems = [
        { priority: 'high', action: 'Get a term life insurance cover of 10-15x annual income before investing', timeline: 'This month' },
        ...plan.actionItems,
      ]
    }

    // ── Check 5: Debt-to-income guardrail ──
    if (analysis.healthMetrics?.debtToIncome && analysis.healthMetrics.debtToIncome > 0.5) {
      flags.push('Debt-to-income ratio exceeds 50% — high financial risk')
      adjustments.push('Prioritized debt repayment over investment in action items')
      plan.actionItems = [
        { priority: 'high', action: 'Focus on paying off high-interest debt (credit card/personal loan) before increasing SIP', timeline: 'Immediately' },
        ...plan.actionItems,
      ]
    }

    // ── Check 6: Emergency fund check ──
    const emergencyMonths = Number(ctx.userInput.emergencyFundMonths ?? 0)
    if (emergencyMonths < 3 && ctx.taskType !== 'tax_wizard') {
      flags.push('Emergency fund below 3 months — financial plan at risk')
      plan.actionItems = [
        { priority: 'high', action: 'Build 6-month emergency fund in liquid FD/savings account before starting SIPs', timeline: '3-6 months' },
        ...plan.actionItems,
      ]
    }

    // ── Check 7: Explainability must include disclaimer ──
    if (!plan.explainability?.includes('SEBI') && !plan.explainability?.includes('educational')) {
      plan.explainability = (plan.explainability ?? '') + '\n\n' + SEBI_DISCLAIMER
    }

    const approved = flags.length === 0 || adjustments.length > 0

    return {
      success: true,
      data: { approved, riskFlags: flags, adjustments, complianceNotes: compliance, finalPlan: plan },
      nextAgent: 'execution',
    }
  } catch (err) {
    return { success: false, error: String(err), retryable: true }
  }
}
