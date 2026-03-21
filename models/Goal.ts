import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IGoal extends Document {
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  category: 'retirement' | 'house' | 'education' | 'emergency' | 'travel' | 'vehicle' | 'other'
  priority: 'high' | 'medium' | 'low'
  progress: number // 0-100
  monthlySIPRequired: number
  notes?: string
  completed: boolean
  createdAt: Date
  updatedAt: Date
}

const GoalSchema = new Schema<IGoal>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    targetDate: { type: String, required: true },
    category: {
      type: String,
      enum: ['retirement', 'house', 'education', 'emergency', 'travel', 'vehicle', 'other'],
      default: 'other',
    },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    monthlySIPRequired: { type: Number, default: 0 },
    notes: String,
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Auto-calculate progress before save
GoalSchema.pre('save', function () {
  if (this.targetAmount > 0) {
    this.progress = Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100))
    this.completed = this.progress >= 100
  }
})

const Goal: Model<IGoal> =
  mongoose.models.Goal || mongoose.model<IGoal>('Goal', GoalSchema)

export default Goal
