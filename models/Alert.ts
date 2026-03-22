import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IAlert extends Document {
  userId: string
  message: string
  severity: 'critical' | 'warning' | 'info' | 'success'
  category: string
  actionUrl?: string
  read: boolean
  dismissed: boolean
  createdAt: Date
}

const AlertSchema = new Schema<IAlert>(
  {
    userId: { type: String, required: true, index: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ['critical', 'warning', 'info', 'success'],
      default: 'info',
    },
    category: { type: String, default: 'general' },
    actionUrl: String,
    read: { type: Boolean, default: false },
    dismissed: { type: Boolean, default: false },
  },
  { timestamps: true }
)

const Alert: Model<IAlert> =
  mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema)

export default Alert