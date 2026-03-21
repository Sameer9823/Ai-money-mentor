import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUser extends Document {
  name: string
  email: string
  password?: string
  image?: string
  provider: 'credentials' | 'google'
  profile?: {
    age?: number
    monthlyIncome?: number
    monthlyExpenses?: number
    riskProfile?: 'conservative' | 'moderate' | 'aggressive'
    goals?: string[]
  }
  healthScore?: number
  netWorth?: number
  alerts?: Array<{ message: string; type: string; createdAt: Date; read: boolean }>
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    image: { type: String },
    provider: { type: String, enum: ['credentials', 'google'], default: 'credentials' },
    profile: {
      age: Number,
      monthlyIncome: Number,
      monthlyExpenses: Number,
      riskProfile: { type: String, enum: ['conservative', 'moderate', 'aggressive'] },
      goals: [String],
    },
    healthScore: { type: Number, min: 0, max: 100 },
    netWorth: Number,
    alerts: [
      {
        message: String,
        type: { type: String, enum: ['warning', 'tip', 'alert', 'success'] },
        createdAt: { type: Date, default: Date.now },
        read: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
)

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
export default User
