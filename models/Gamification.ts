import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IBadge {
  id: string
  name: string
  description: string
  icon: string
  earnedAt: Date
}

export interface IGamification extends Document {
  userId: string
  savingsStreak: number
  longestStreak: number
  lastCheckin: string
  totalPoints: number
  badges: IBadge[]
  level: number
  levelName: string
}

const GamificationSchema = new Schema<IGamification>(
  {
    userId: { type: String, required: true, unique: true },
    savingsStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCheckin: { type: String, default: '' },
    totalPoints: { type: Number, default: 0 },
    badges: [
      {
        id: String,
        name: String,
        description: String,
        icon: String,
        earnedAt: { type: Date, default: Date.now },
      },
    ],
    level: { type: Number, default: 1 },
    levelName: { type: String, default: 'Beginner Investor' },
  },
  { timestamps: true }
)

const Gamification: Model<IGamification> =
  mongoose.models.Gamification ||
  mongoose.model<IGamification>('Gamification', GamificationSchema)

export default Gamification