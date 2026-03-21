import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IFinancialProfile extends Document {
  userId: string
  version: number
  income: {
    monthly: number
    annual: number
    other: number
  }
  expenses: {
    monthly: number
    rent: number
    emi: number
    other: number
  }
  savings: {
    total: number
    emergencyFund: number
    emergencyMonths: number
  }
  investments: {
    total: number
    equity: number
    debt: number
    gold: number
    ppf: number
    nps: number
    mutualFunds: number
  }
  insurance: {
    hasTermInsurance: boolean
    termCover: number
    hasHealthInsurance: boolean
    healthCover: number
  }
  tax: {
    regime: 'old' | 'new' | 'unknown'
    section80C: number
    section80D: number
    npsContribution: number
    homeLoanInterest: number
  }
  liabilities: {
    totalDebt: number
    homeLoan: number
    carLoan: number
    personalLoan: number
    creditCard: number
  }
  personal: {
    age: number
    city: string
    cityType: 'metro' | 'non-metro'
    riskProfile: 'conservative' | 'moderate' | 'aggressive'
    retirementAge: number
  }
  // Latest AI outputs
  latestAnalysis?: {
    healthScore: number
    xirr: number
    retirementReadiness: number
    taxSaved: number
    netWorth: number
    updatedAt: string
  }
  updatedAt: Date
  createdAt: Date
}

const FinancialProfileSchema = new Schema<IFinancialProfile>(
  {
    userId: { type: String, required: true, index: true },
    version: { type: Number, default: 1 },
    income: {
      monthly: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    expenses: {
      monthly: { type: Number, default: 0 },
      rent: { type: Number, default: 0 },
      emi: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    savings: {
      total: { type: Number, default: 0 },
      emergencyFund: { type: Number, default: 0 },
      emergencyMonths: { type: Number, default: 0 },
    },
    investments: {
      total: { type: Number, default: 0 },
      equity: { type: Number, default: 0 },
      debt: { type: Number, default: 0 },
      gold: { type: Number, default: 0 },
      ppf: { type: Number, default: 0 },
      nps: { type: Number, default: 0 },
      mutualFunds: { type: Number, default: 0 },
    },
    insurance: {
      hasTermInsurance: { type: Boolean, default: false },
      termCover: { type: Number, default: 0 },
      hasHealthInsurance: { type: Boolean, default: false },
      healthCover: { type: Number, default: 0 },
    },
    tax: {
      regime: { type: String, enum: ['old', 'new', 'unknown'], default: 'unknown' },
      section80C: { type: Number, default: 0 },
      section80D: { type: Number, default: 0 },
      npsContribution: { type: Number, default: 0 },
      homeLoanInterest: { type: Number, default: 0 },
    },
    liabilities: {
      totalDebt: { type: Number, default: 0 },
      homeLoan: { type: Number, default: 0 },
      carLoan: { type: Number, default: 0 },
      personalLoan: { type: Number, default: 0 },
      creditCard: { type: Number, default: 0 },
    },
    personal: {
      age: { type: Number, default: 30 },
      city: { type: String, default: 'Mumbai' },
      cityType: { type: String, enum: ['metro', 'non-metro'], default: 'metro' },
      riskProfile: { type: String, enum: ['conservative', 'moderate', 'aggressive'], default: 'moderate' },
      retirementAge: { type: Number, default: 60 },
    },
    latestAnalysis: {
      healthScore: Number,
      xirr: Number,
      retirementReadiness: Number,
      taxSaved: Number,
      netWorth: Number,
      updatedAt: String,
    },
  },
  { timestamps: true }
)

// Auto-increment version on save
FinancialProfileSchema.pre('findOneAndUpdate', function () {
  this.updateOne({}, { $inc: { version: 1 } })
})

const FinancialProfile: Model<IFinancialProfile> =
  mongoose.models.FinancialProfile ||
  mongoose.model<IFinancialProfile>('FinancialProfile', FinancialProfileSchema)

export default FinancialProfile
