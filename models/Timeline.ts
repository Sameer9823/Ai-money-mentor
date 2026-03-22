import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ITimeline extends Document {
  userId: string
  actionTaken: string
  recommendation: string
  category: 'sip' | 'tax' | 'insurance' | 'portfolio' | 'debt' | 'goal' | 'general'
  impact: string
  impactValue?: number
  status: 'recommended' | 'acted' | 'ignored' | 'pending'
  createdAt: Date
}

const TimelineSchema = new Schema<ITimeline>(
  {
    userId: { type: String, required: true, index: true },
    actionTaken: { type: String, required: true },
    recommendation: { type: String, required: true },
    category: {
      type: String,
      enum: ['sip', 'tax', 'insurance', 'portfolio', 'debt', 'goal', 'general'],
      default: 'general',
    },
    impact: { type: String, default: '' },
    impactValue: Number,
    status: {
      type: String,
      enum: ['recommended', 'acted', 'ignored', 'pending'],
      default: 'recommended',
    },
  },
  { timestamps: true }
)

const Timeline: Model<ITimeline> =
  mongoose.models.Timeline || mongoose.model<ITimeline>('Timeline', TimelineSchema)

export default Timeline