import { AgentContext, AgentStep, TaskType, UserMemory } from '@/types/agents'
import { dataAgent, DataAgentOutput } from './dataAgent'
import { analysisAgent, AnalysisOutput } from './analysisAgent'
import { planningAgent, PlanningOutput } from './planningAgent'
import { riskAgent, RiskOutput } from './riskAgent'
import { executionAgent, ExecutionOutput } from './executionAgent'
import { memoryAgent } from './memoryAgent'
import { createAuditLog, logStep, completeAuditLog, failAuditLog } from '@/lib/auditLogger'
import { randomUUID } from 'crypto'

export interface OrchestratorInput {
  taskType: TaskType
  userId: string
  userInput: Record<string, unknown>
}

// ─── Orchestrator ──────────────────────────────────────────────────────────
// Controls the full agent pipeline.
// Handles retries, branching, and failure recovery.

export async function orchestrate(input: OrchestratorInput): Promise<ExecutionOutput> {
  const taskId = randomUUID()
  const ctx: AgentContext = {
    taskId,
    taskType: input.taskType,
    userId: input.userId,
    userInput: input.userInput,
    steps: [],
    retryCount: 0,
    maxRetries: 3,
  }

  createAuditLog(ctx)

  try {
    // ═══════════════════════════════════════════
    // STEP 1: Load Memory
    // ═══════════════════════════════════════════
    let memory: UserMemory | null = null
    await runStep(ctx, 'memory', 'load', async () => {
      const result = await memoryAgent(ctx, 'load')
      if (result.success) memory = result.data ?? null
      ctx.memory = memory ?? undefined
    })

    // ═══════════════════════════════════════════
    // STEP 2: Data Agent — fetch & validate
    // ═══════════════════════════════════════════
    let dataOutput: DataAgentOutput = { dataQuality: 'complete' }
    let dataRetries = 0

    while (dataRetries <= 2) {
      const dataResult = await runStep(ctx, 'data', 'fetch', async () => {
        return await dataAgent(ctx)
      })

      if (dataResult?.success && dataResult.data) {
        dataOutput = dataResult.data as DataAgentOutput

        // If data insufficient → don't proceed
        if (dataOutput.dataQuality === 'insufficient') {
          throw new AgentError(
            `Insufficient data. Missing fields: ${dataOutput.missingFields?.join(', ')}`,
            false
          )
        }
        break // data OK
      } else if (dataResult?.retryable && dataRetries < 2) {
        dataRetries++
        ctx.retryCount++
        await sleep(500 * dataRetries) // exponential backoff
      } else {
        throw new AgentError(dataResult?.error ?? 'Data agent failed', false)
      }
    }

    // ═══════════════════════════════════════════
    // STEP 3: Analysis Agent — deterministic
    // ═══════════════════════════════════════════
    let analysisOutput: AnalysisOutput = {}
    let analysisRetries = 0

    while (analysisRetries <= 2) {
      const analysisResult = await runStep(ctx, 'analysis', 'compute', async () => {
        return await analysisAgent(ctx, dataOutput)
      })

      if (analysisResult?.success && analysisResult.data) {
        analysisOutput = analysisResult.data as AnalysisOutput
        break
      } else if (analysisResult?.retryable && analysisRetries < 2) {
        analysisRetries++
        ctx.retryCount++
        await sleep(300)
      } else {
        throw new AgentError(analysisResult?.error ?? 'Analysis failed', false)
      }
    }

    // ═══════════════════════════════════════════
    // STEP 4: Planning Agent — LLM reasoning
    // ═══════════════════════════════════════════
    let planOutput: PlanningOutput | null = null
    let planRetries = 0
    const maxPlanRetries = 2

    while (planRetries <= maxPlanRetries) {
      const planResult = await runStep(ctx, 'planning', 'generate', async () => {
        return await planningAgent(ctx, analysisOutput, memory)
      })

      if (planResult?.success && planResult.data) {
        planOutput = planResult.data as PlanningOutput
        break
      } else if (planResult?.error === 'JSON_PARSE_FAILED' && planRetries < maxPlanRetries) {
        // Retry planning with simpler constraints
        planRetries++
        ctx.retryCount++
        ctx.userInput._simplify = true // hint to planning agent
        await sleep(500)
      } else if (planResult?.retryable && planRetries < maxPlanRetries) {
        planRetries++
        ctx.retryCount++
        await sleep(1000)
      } else {
        throw new AgentError(planResult?.error ?? 'Planning failed', false)
      }
    }

    if (!planOutput) throw new AgentError('Planning agent produced no output', false)

    // ═══════════════════════════════════════════
    // STEP 5: Risk & Compliance Agent
    // ═══════════════════════════════════════════
    let riskOutput: RiskOutput | null = null
    const riskResult = await runStep(ctx, 'risk', 'validate', async () => {
      return await riskAgent(ctx, analysisOutput, planOutput!)
    })

    if (riskResult?.success && riskResult.data) {
      riskOutput = riskResult.data as RiskOutput

      // If plan invalid → re-run planning with risk constraints
      if (!riskOutput.approved && planRetries < maxPlanRetries) {
        ctx.userInput._riskFlags = riskOutput.riskFlags
        const replanResult = await runStep(ctx, 'planning', 'replan', async () => {
          return await planningAgent(ctx, analysisOutput, memory)
        })
        if (replanResult?.success && replanResult.data) {
          planOutput = replanResult.data as PlanningOutput
          // Re-run risk check on new plan
          const reRisk = await riskAgent(ctx, analysisOutput, planOutput)
          if (reRisk.success && reRisk.data) riskOutput = reRisk.data
        }
      }
    } else {
      // Risk agent failed — use plan as-is with disclaimer
      riskOutput = {
        approved: true,
        riskFlags: ['Risk validation unavailable'],
        adjustments: [],
        complianceNotes: ['This is for educational purposes only. Consult a SEBI-registered advisor.'],
        finalPlan: planOutput,
      }
    }

    // ═══════════════════════════════════════════
    // STEP 6: Execution Agent — final output
    // ═══════════════════════════════════════════
    let finalOutput: ExecutionOutput | null = null
    const execResult = await runStep(ctx, 'execution', 'assemble', async () => {
      return await executionAgent(ctx, analysisOutput, riskOutput!, dataOutput.dataQuality)
    })

    if (execResult?.success && execResult.data) {
      finalOutput = execResult.data as ExecutionOutput
    } else {
      throw new AgentError('Execution agent failed', false)
    }

    // ═══════════════════════════════════════════
    // STEP 7: Save to Memory
    // ═══════════════════════════════════════════
    await runStep(ctx, 'memory', 'save', async () => {
      const memoryUpdate = buildMemoryUpdate(ctx, analysisOutput, finalOutput!)
      await memoryAgent(ctx, 'save', memoryUpdate)
    })

    completeAuditLog(taskId, finalOutput)
    return finalOutput

  } catch (err) {
    const msg = err instanceof AgentError ? err.message : String(err)
    failAuditLog(taskId, msg)
    throw err
  }
}

// ─── Step runner with logging ──────────────────────────────────────────────
async function runStep<T>(
  ctx: AgentContext,
  agent: string,
  action: string,
  fn: () => Promise<T>
): Promise<T | undefined> {
  const step: AgentStep = {
    agent: agent as AgentStep['agent'],
    status: 'running',
    timestamp: new Date().toISOString(),
    input: { action },
  }
  ctx.steps.push(step)

  const start = Date.now()
  try {
    const result = await fn()
    step.status = 'success'
    step.output = result
    step.durationMs = Date.now() - start
    return result
  } catch (err) {
    step.status = 'failed'
    step.error = String(err)
    step.durationMs = Date.now() - start
    // Non-critical steps (memory) should not throw
    if (agent === 'memory') return undefined
    throw err
  }
}

// ─── Memory update builder ─────────────────────────────────────────────────
function buildMemoryUpdate(
  ctx: AgentContext,
  analysis: AnalysisOutput,
  execution: ExecutionOutput
): Partial<UserMemory> {
  const update: Partial<UserMemory> = {
    profile: {},
    financialHistory: { updatedAt: new Date().toISOString() },
    pastRecommendations: [{
      type: ctx.taskType,
      summary: execution.summary,
      createdAt: new Date().toISOString(),
      acted: false,
    }],
  }

  const input = ctx.userInput
  if (input.age) update.profile!.age = Number(input.age)
  if (input.monthlyIncome) update.profile!.monthlyIncome = Number(input.monthlyIncome)
  if (input.monthlyExpenses) update.profile!.monthlyExpenses = Number(input.monthlyExpenses)
  if (input.riskProfile) update.profile!.riskProfile = input.riskProfile as UserMemory['profile']['riskProfile']

  if (analysis.fireMetrics) {
    update.financialHistory!.lastFirePlan = {
      monthlySIP: analysis.fireMetrics.requiredSIP,
      retirementCorpus: analysis.fireMetrics.retirementCorpusNeeded,
      yearsToFIRE: analysis.fireMetrics.yearsToRetirement,
      createdAt: new Date().toISOString(),
    }
  }

  if (execution.impactDashboard.retirementReadiness) {
    // Store health/retirement score
  }

  return update
}

// ─── Utilities ─────────────────────────────────────────────────────────────
class AgentError extends Error {
  constructor(message: string, public retryable: boolean) {
    super(message)
    this.name = 'AgentError'
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
