import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUserMemory extends Document {
  userId: string
  profile: {
    age?: number
    monthlyIncome?: number
    monthlyExpenses?: number
    riskProfile?: string
    goals?: string[]
    city?: string
  }
  financialHistory: {
    healthScore?: number
    lastFirePlan?: {
      monthlySIP: number
      retirementCorpus: number
      yearsToFIRE: number
      createdAt: string
    }
    lastTaxAnalysis?: {
      recommendedRegime: string
      totalTax: number
      savings: number
      createdAt: string
    }
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
    type: string
    summary: string
    createdAt: string
    acted: boolean
  }>
  // ✅ ADD THIS NEW FIELD
  stockPortfolio?: Array<{
    symbol: string
    name: string
    units: number
    buyPrice: number
  }>
}

const UserMemorySchema = new Schema<IUserMemory>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    profile: {
      age: Number,
      monthlyIncome: Number,
      monthlyExpenses: Number,
      riskProfile: String,
      goals: [String],
      city: String,
    },
    financialHistory: {
      healthScore: Number,
      lastFirePlan: {
        monthlySIP: Number,
        retirementCorpus: Number,
        yearsToFIRE: Number,
        createdAt: String,
      },
      lastTaxAnalysis: {
        recommendedRegime: String,
        totalTax: Number,
        savings: Number,
        createdAt: String,
      },
      netWorth: Number,
      updatedAt: { type: String, default: () => new Date().toISOString() },
    },
    behaviorPatterns: {
      ignoredAdvice: { type: [String], default: [] },
      completedActions: { type: [String], default: [] },
      preferredRiskLevel: String,
      engagementScore: { type: Number, default: 0 },
    },
    pastRecommendations: [
      {
        type: String,
        summary: String,
        createdAt: String,
        acted: { type: Boolean, default: false },
      },
    ],
    // ✅ ADD THIS NEW FIELD TO SCHEMA
    stockPortfolio: [
      {
        symbol: { type: String, required: true },
        name: { type: String, required: true },
        units: { type: Number, required: true },
        buyPrice: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
)

const UserMemoryModel: Model<IUserMemory> =
  mongoose.models.UserMemory ||
  mongoose.model<IUserMemory>('UserMemory', UserMemorySchema)

export default UserMemoryModel