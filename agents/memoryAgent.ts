import { AgentContext, AgentResult, UserMemory, TaskType } from '@/types/agents'
import { connectDB } from '@/lib/db'
import UserMemoryModel from '@/models/UserMemory'

// ─── Type Guards ──────────────────────────────────────────────────────────

function isValidTaskType(type: string): type is TaskType {
  return ['fire_plan', 'portfolio_xray', 'tax_wizard', 'sip_optimizer'].includes(type)
}

function isValidRiskProfile(profile: string): profile is 'conservative' | 'moderate' | 'aggressive' {
  return ['conservative', 'moderate', 'aggressive'].includes(profile)
}

function isValidTaxRegime(regime: string): regime is 'new' | 'old' {
  return ['new', 'old'].includes(regime)
}

// ─── Memory Agent ─────────────────────────────────────────────────────────
// Stores user financial history, past recommendations, behavioral patterns.
// Adjusts future recommendations based on ignored advice.

export async function memoryAgent(
  ctx: AgentContext,
  action: 'load' | 'save',
  data?: Partial<UserMemory>
): Promise<AgentResult<UserMemory | null>> {
  try {
    await connectDB()

    if (action === 'load') {
      const doc = await UserMemoryModel.findOne({ userId: ctx.userId }).lean()
      if (!doc) return { success: true, data: null }

      // Type-safe validation for profile
      const riskProfile = doc.profile?.riskProfile
      const validRiskProfile = riskProfile && isValidRiskProfile(riskProfile) 
        ? riskProfile 
        : undefined

      // Type-safe validation for financialHistory
      const lastTaxAnalysis = doc.financialHistory?.lastTaxAnalysis
      const validTaxAnalysis = lastTaxAnalysis && 
        lastTaxAnalysis.recommendedRegime &&
        isValidTaxRegime(lastTaxAnalysis.recommendedRegime)
        ? {
            recommendedRegime: lastTaxAnalysis.recommendedRegime,
            totalTax: lastTaxAnalysis.totalTax,
            savings: lastTaxAnalysis.savings,
            createdAt: lastTaxAnalysis.createdAt,
          }
        : undefined

      const lastFirePlan = doc.financialHistory?.lastFirePlan
        ? {
            monthlySIP: doc.financialHistory.lastFirePlan.monthlySIP,
            retirementCorpus: doc.financialHistory.lastFirePlan.retirementCorpus,
            yearsToFIRE: doc.financialHistory.lastFirePlan.yearsToFIRE,
            createdAt: doc.financialHistory.lastFirePlan.createdAt,
          }
        : undefined

      // Type-safe validation for pastRecommendations
      const validRecommendations = (doc.pastRecommendations ?? [])
        .filter((rec: any) => rec?.type && isValidTaskType(rec.type))
        .map((rec: any) => ({
          type: rec.type as TaskType,
          summary: rec.summary,
          createdAt: rec.createdAt,
          acted: rec.acted,
        }))

      const memory: UserMemory = {
        userId: doc.userId,
        profile: {
          age: doc.profile?.age,
          monthlyIncome: doc.profile?.monthlyIncome,
          monthlyExpenses: doc.profile?.monthlyExpenses,
          riskProfile: validRiskProfile,
          goals: doc.profile?.goals,
          city: doc.profile?.city,
        },
        financialHistory: {
          healthScore: doc.financialHistory?.healthScore,
          lastFirePlan: lastFirePlan,
          lastTaxAnalysis: validTaxAnalysis,
          netWorth: doc.financialHistory?.netWorth,
          updatedAt: doc.financialHistory?.updatedAt ?? new Date().toISOString(),
        },
        behaviorPatterns: doc.behaviorPatterns ?? {
          ignoredAdvice: [],
          completedActions: [],
          engagementScore: 0,
        },
        pastRecommendations: validRecommendations,
      }
      return { success: true, data: memory }
    }

    if (action === 'save' && data) {
      const now = new Date().toISOString()

      // Build update payload
      const update: Record<string, unknown> = {}

      if (data.profile) {
        for (const [k, v] of Object.entries(data.profile)) {
          if (v !== undefined) {
            // Validate riskProfile before saving
            if (k === 'riskProfile' && typeof v === 'string') {
              if (isValidRiskProfile(v)) {
                update[`profile.${k}`] = v
              }
            } else {
              update[`profile.${k}`] = v
            }
          }
        }
      }

      if (data.financialHistory) {
        for (const [k, v] of Object.entries(data.financialHistory)) {
          if (v !== undefined) {
            // Validate lastTaxAnalysis
            if (k === 'lastTaxAnalysis' && typeof v === 'object' && v !== null) {
              const taxAnalysis = v as any
              if (taxAnalysis.recommendedRegime && isValidTaxRegime(taxAnalysis.recommendedRegime)) {
                update[`financialHistory.${k}`] = v
              }
            } else {
              update[`financialHistory.${k}`] = v
            }
          }
        }
        update['financialHistory.updatedAt'] = now
      }

      // Append new recommendation with type validation
      if (data.pastRecommendations?.length) {
        const validRecommendations = data.pastRecommendations.filter(rec => 
          rec.type && isValidTaskType(rec.type)
        )

        if (validRecommendations.length > 0) {
          await UserMemoryModel.findOneAndUpdate(
            { userId: ctx.userId },
            {
              $set: update,
              $push: {
                pastRecommendations: {
                  $each: validRecommendations,
                  $slice: -20, // keep last 20
                },
              },
              $inc: { 'behaviorPatterns.engagementScore': 1 },
            },
            { upsert: true, new: true }
          )
        } else {
          await UserMemoryModel.findOneAndUpdate(
            { userId: ctx.userId },
            { $set: update },
            { upsert: true, new: true }
          )
        }
      } else {
        await UserMemoryModel.findOneAndUpdate(
          { userId: ctx.userId },
          { $set: update },
          { upsert: true, new: true }
        )
      }

      return { success: true, data: null }
    }

    return { success: false, error: 'Invalid memory action' }
  } catch (err) {
    return { success: false, error: String(err), retryable: true }
  }
}

// ─── Behavior adaptation ──────────────────────────────────────────────────
// If user ignored SIP advice before → adjust strategy
export function adaptStrategyFromMemory(
  memory: UserMemory | null,
  taskType: TaskType
): Record<string, unknown> {
  if (!memory) return {}

  const ignored = memory.behaviorPatterns.ignoredAdvice
  const adaptations: Record<string, unknown> = {}

  if (taskType === 'fire_plan') {
    if (ignored.includes('increase_sip')) {
      adaptations.sipAdjustment = 'User previously ignored SIP increase advice. Suggest smaller incremental steps.'
      adaptations.tone = 'conservative'
    }
    if (memory.financialHistory.lastFirePlan) {
      adaptations.previousPlan = memory.financialHistory.lastFirePlan
      adaptations.note = 'User has a previous FIRE plan. Show delta from last plan.'
    }
  }

  if (taskType === 'portfolio_xray') {
    if (ignored.includes('rebalance')) {
      adaptations.rebalanceNote = 'User has previously ignored rebalancing. Provide stronger justification.'
    }
  }

  if (taskType === 'tax_wizard') {
    if (memory.financialHistory.lastTaxAnalysis) {
      adaptations.lastAnalysis = memory.financialHistory.lastTaxAnalysis
    }
  }

  return adaptations
}

// ─── Mark advice as ignored/acted ─────────────────────────────────────────
export async function markAdviceFeedback(
  userId: string,
  advice: string,
  acted: boolean
): Promise<void> {
  try {
    await connectDB()
    if (acted) {
      await UserMemoryModel.findOneAndUpdate(
        { userId },
        { $addToSet: { 'behaviorPatterns.completedActions': advice } },
        { upsert: true }
      )
    } else {
      await UserMemoryModel.findOneAndUpdate(
        { userId },
        { $addToSet: { 'behaviorPatterns.ignoredAdvice': advice } },
        { upsert: true }
      )
    }
  } catch { /* non-critical */ }
}