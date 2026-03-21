import { AgentContext, AgentResult } from '@/types/agents'
import { AnalysisOutput } from './analysisAgent'
import { RiskOutput } from './riskAgent'
import { formatCurrency } from '@/tools/financialTools'

export interface ExecutionOutput {
  // Final merged output
  taskType: string
  summary: string
  plan: RiskOutput['finalPlan']
  analysis: AnalysisOutput
  riskFlags: string[]
  adjustments: string[]
  complianceNotes: string[]
  impactDashboard: {
    taxSaved: number
    portfolioImprovement: number
    retirementReadiness: number
    netWorthGrowth: number
    formattedTaxSaved: string
    formattedNetWorthGrowth: string
  }
  monthlyChecklist: Array<{ week: number; task: string; done: boolean }>
  auditSummary: {
    agentsRun: string[]
    totalSteps: number
    dataQuality: string
    retries: number
  }
}

// ─── Execution Agent ───────────────────────────────────────────────────────
// Assembles final output. Produces actionable monthly checklist.
// Formats impact dashboard numbers.

export async function executionAgent(
  ctx: AgentContext,
  analysis: AnalysisOutput,
  riskOutput: RiskOutput,
  dataQuality: string
): Promise<AgentResult<ExecutionOutput>> {
  try {
    const plan = riskOutput.finalPlan

    // Build impact dashboard
    const im = plan.impactMetrics ?? {}
    const taxSaved = im.taxSaved ?? riskOutput.finalPlan.taxSuggestions?.length ? 0 : 0
    const portfolioImprovement = im.portfolioImprovement ?? analysis.portfolioMetrics?.returnPct ?? 0
    const retirementReadiness = im.retirementReadiness ?? computeRetirementReadiness(analysis)
    const netWorthGrowth = im.netWorthGrowth ?? estimateNetWorthGrowth(ctx, analysis)

    const impactDashboard = {
      taxSaved,
      portfolioImprovement,
      retirementReadiness,
      netWorthGrowth,
      formattedTaxSaved: formatCurrency(taxSaved),
      formattedNetWorthGrowth: formatCurrency(netWorthGrowth),
    }

    // Build 4-week monthly checklist from action items
    const monthlyChecklist = (plan.actionItems ?? [])
      .slice(0, 8)
      .map((item, i) => ({
        week: Math.min(4, Math.floor(i / 2) + 1),
        task: item.action,
        done: false,
      }))

    const output: ExecutionOutput = {
      taskType: ctx.taskType,
      summary: plan.strategy ?? 'Financial plan generated successfully.',
      plan,
      analysis,
      riskFlags: riskOutput.riskFlags,
      adjustments: riskOutput.adjustments,
      complianceNotes: riskOutput.complianceNotes,
      impactDashboard,
      monthlyChecklist,
      auditSummary: {
        agentsRun: ['orchestrator', 'data', 'analysis', 'planning', 'risk', 'execution', 'memory'],
        totalSteps: ctx.steps.length,
        dataQuality,
        retries: ctx.retryCount,
      },
    }

    return { success: true, data: output }
  } catch (err) {
    return { success: false, error: String(err), retryable: false }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function computeRetirementReadiness(analysis: AnalysisOutput): number {
  if (analysis.fireMetrics) {
    const { projectedCorpus, retirementCorpusNeeded } = analysis.fireMetrics
    if (retirementCorpusNeeded > 0) {
      return Math.min(100, Math.round((projectedCorpus / retirementCorpusNeeded) * 100))
    }
  }
  return 0
}

function estimateNetWorthGrowth(ctx: AgentContext, analysis: AnalysisOutput): number {
  if (analysis.fireMetrics) {
    const sip = analysis.fireMetrics.requiredSIP
    return sip * 12 * 5 * 1.12 // rough 5-year projection
  }
  if (analysis.portfolioMetrics) {
    return analysis.portfolioMetrics.absoluteReturn
  }
  return 0
}
