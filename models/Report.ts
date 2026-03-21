import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IReport extends Document {
  reportId: string
  userId: string
  profileVersion: number
  type: 'fire_plan' | 'money_health' | 'tax_wizard' | 'portfolio_xray' | 'life_event' | 'couples_plan' | 'full'
  title: string
  // Full input/output for reproducibility
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  // Agent audit trail
  agentLogs: Array<{
    agent: string
    status: string
    durationMs: number
    timestamp: string
    error?: string
  }>
  // Computed metrics
  metrics: {
    healthScore?: number
    taxSaved?: number
    xirr?: number
    retirementReadiness?: number
    netWorthGrowth?: number
    portfolioImprovement?: number
  }
  // Before/After comparison
  comparison?: {
    before: Record<string, number>
    after: Record<string, number>
    improvements: Array<{ metric: string; before: number; after: number; delta: number; label: string }>
  }
  pdfGenerated: boolean
  deletedAt?: Date
  createdAt: Date
}

const ReportSchema = new Schema<IReport>(
  {
    reportId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    profileVersion: { type: Number, default: 1 },
    type: {
      type: String,
      enum: ['fire_plan', 'money_health', 'tax_wizard', 'portfolio_xray', 'life_event', 'couples_plan', 'full'],
      required: true,
    },
    title: { type: String, required: true },
    inputs: { type: Schema.Types.Mixed, default: {} },
    outputs: { type: Schema.Types.Mixed, default: {} },
    agentLogs: [
      {
        agent: String,
        status: String,
        durationMs: Number,
        timestamp: String,
        error: String,
      },
    ],
    metrics: {
      healthScore: Number,
      taxSaved: Number,
      xirr: Number,
      retirementReadiness: Number,
      netWorthGrowth: Number,
      portfolioImprovement: Number,
    },
    comparison: {
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
      improvements: [
        {
          metric: String,
          before: Number,
          after: Number,
          delta: Number,
          label: String,
        },
      ],
    },
    pdfGenerated: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true }
)

const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema)

export default Report
