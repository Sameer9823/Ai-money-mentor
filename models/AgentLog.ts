import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IAgentLog extends Document {
  taskId: string
  userId: string
  taskType: string
  reportId?: string
  startedAt: string
  completedAt?: string
  totalDurationMs?: number
  status: 'running' | 'completed' | 'failed'
  retryCount: number
  steps: Array<{
    agent: string
    action: string
    status: string
    durationMs?: number
    timestamp: string
    error?: string
    inputSummary?: string
    outputSummary?: string
  }>
  errorMessage?: string
}

const AgentLogSchema = new Schema<IAgentLog>(
  {
    taskId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    taskType: { type: String, required: true },
    reportId: String,
    startedAt: { type: String, required: true },
    completedAt: String,
    totalDurationMs: Number,
    status: { type: String, enum: ['running', 'completed', 'failed'], default: 'running' },
    retryCount: { type: Number, default: 0 },
    steps: [
      {
        agent: String,
        action: String,
        status: String,
        durationMs: Number,
        timestamp: String,
        error: String,
        inputSummary: String,
        outputSummary: String,
      },
    ],
    errorMessage: String,
  },
  { timestamps: true }
)

const AgentLog: Model<IAgentLog> =
  mongoose.models.AgentLog || mongoose.model<IAgentLog>('AgentLog', AgentLogSchema)

export default AgentLog
