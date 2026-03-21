import { AgentStep, AgentContext, AuditLog } from '@/types/agents'

const auditStore = new Map<string, AuditLog>()

export function createAuditLog(ctx: AgentContext): void {
  auditStore.set(ctx.taskId, {
    taskId: ctx.taskId,
    userId: ctx.userId,
    taskType: ctx.taskType,
    startedAt: new Date().toISOString(),
    steps: [],
    status: 'running',
    retryCount: 0,
  })
}

export function logStep(taskId: string, step: AgentStep): void {
  const log = auditStore.get(taskId)
  if (log) {
    log.steps.push(step)
    if (step.retryCount) log.retryCount = Math.max(log.retryCount, step.retryCount)
  }
}

export function completeAuditLog(taskId: string, output: unknown): void {
  const log = auditStore.get(taskId)
  if (log) {
    log.completedAt = new Date().toISOString()
    log.totalDurationMs = Date.parse(log.completedAt) - Date.parse(log.startedAt)
    log.finalOutput = output
    log.status = 'completed'
  }
}

export function failAuditLog(taskId: string, error: string): void {
  const log = auditStore.get(taskId)
  if (log) {
    log.completedAt = new Date().toISOString()
    log.totalDurationMs = Date.parse(log.completedAt) - Date.parse(log.startedAt)
    log.status = 'failed'
    log.errorMessage = error
  }
}

export function getAuditLog(taskId: string): AuditLog | undefined {
  return auditStore.get(taskId)
}

export function getRecentLogs(userId: string, limit = 10): AuditLog[] {
  return Array.from(auditStore.values())
    .filter(l => l.userId === userId)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, limit)
}

// Helper to time an agent step
export async function withTiming<T>(
  taskId: string,
  step: Omit<AgentStep, 'timestamp' | 'durationMs'>,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  logStep(taskId, { ...step, timestamp: new Date().toISOString() })
  try {
    const result = await fn()
    const end = Date.now()
    logStep(taskId, {
      ...step,
      status: 'success',
      output: result,
      timestamp: new Date().toISOString(),
      durationMs: end - start,
    })
    return result
  } catch (err) {
    const end = Date.now()
    logStep(taskId, {
      ...step,
      status: 'failed',
      error: String(err),
      timestamp: new Date().toISOString(),
      durationMs: end - start,
    })
    throw err
  }
}
