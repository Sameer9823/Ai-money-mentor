// ─── Agent System Types ────────────────────────────────────────────────────

export type AgentName =
  | 'orchestrator'
  | 'data'
  | 'analysis'
  | 'planning'
  | 'risk'
  | 'execution'
  | 'memory'

export type TaskType =
  | 'fire_plan'
  | 'money_health'
  | 'tax_wizard'
  | 'life_event'
  | 'couples_plan'
  | 'portfolio_xray'
  | 'chat'

export type AgentStatus = 'idle' | 'running' | 'success' | 'failed' | 'retrying'

export interface AgentStep {
  agent: AgentName
  status: AgentStatus
  input?: unknown
  output?: unknown
  error?: string
  durationMs?: number
  timestamp: string
  retryCount?: number
}

export interface AgentContext {
  taskId: string
  taskType: TaskType
  userId: string
  userInput: Record<string, unknown>
  steps: AgentStep[]
  memory?: UserMemory
  retryCount: number
  maxRetries: number
}

export interface AgentResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  retryable?: boolean
  nextAgent?: AgentName
}

// ─── User Memory ───────────────────────────────────────────────────────────

export interface UserMemory {
  userId: string
  profile: {
    age?: number
    monthlyIncome?: number
    monthlyExpenses?: number
    riskProfile?: 'conservative' | 'moderate' | 'aggressive'
    goals?: string[]
    city?: string
  }
  financialHistory: {
    healthScore?: number
    lastFirePlan?: FirePlanSummary
    lastTaxAnalysis?: TaxSummary
    netWorth?: number
    updatedAt: string
  }
  behaviorPatterns: {
    ignoredAdvice: string[]
    completedActions: string[]
    preferredRiskLevel?: string
    engagementScore: number
  }
  pastRecommendations: Array<{
    type: TaskType
    summary: string
    createdAt: string
    acted: boolean
  }>
}

export interface FirePlanSummary {
  monthlySIP: number
  retirementCorpus: number
  yearsToFIRE: number
  createdAt: string
}

export interface TaxSummary {
  recommendedRegime: 'old' | 'new'
  totalTax: number
  savings: number
  createdAt: string
}

// ─── Tool Results ──────────────────────────────────────────────────────────

export interface MutualFundNAV {
  schemeCode: string
  schemeName: string
  nav: number
  date: string
  category?: string
}

export interface PortfolioFund {
  name: string
  category: string
  investedAmount: number
  currentValue: number
  units: number
  nav: number
  expenseRatio?: number
  nav_data?: MutualFundNAV
}

export interface TaxInput {
  basicSalary: number
  hra: number
  specialAllowance: number
  otherIncome: number
  rentPaid?: number
  cityType?: 'metro' | 'non-metro'
  section80C: number
  section80D: number
  npsContribution: number
  homeLoanInterest: number
  otherDeductions: number
}

// ─── Audit Log ─────────────────────────────────────────────────────────────

export interface AuditLog {
  taskId: string
  userId: string
  taskType: TaskType
  startedAt: string
  completedAt?: string
  totalDurationMs?: number
  steps: AgentStep[]
  finalOutput?: unknown
  status: 'running' | 'completed' | 'failed'
  errorMessage?: string
  retryCount: number
}
