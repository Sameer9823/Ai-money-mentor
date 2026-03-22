import { connectDB } from '@/lib/db'
import UserMemory from '@/models/UserMemory'

export interface SmartQuestion {
  id: string
  question: string
  field: string
  type: 'boolean' | 'number' | 'select' | 'text'
  options?: string[]
  unit?: string
  impactOnScore: number   // how much this improves confidence score
  category: string
}

const QUESTION_BANK: SmartQuestion[] = [
  {
    id: 'q_term_insurance',
    question: 'Do you have a term life insurance policy?',
    field: 'hasTermInsurance',
    type: 'boolean',
    impactOnScore: 10,
    category: 'insurance',
  },
  {
    id: 'q_health_insurance',
    question: 'Do you have health insurance?',
    field: 'hasHealthInsurance',
    type: 'boolean',
    impactOnScore: 8,
    category: 'insurance',
  },
  {
    id: 'q_emergency_months',
    question: 'How many months of expenses do you have in savings?',
    field: 'emergencyFundMonths',
    type: 'select',
    options: ['0', '1-2', '3-5', '6+'],
    impactOnScore: 8,
    category: 'emergency',
  },
  {
    id: 'q_80c_amount',
    question: 'How much have you invested under Section 80C this year?',
    field: 'section80C',
    type: 'number',
    unit: '₹',
    impactOnScore: 8,
    category: 'tax',
  },
  {
    id: 'q_nps',
    question: 'Do you have an NPS (National Pension System) account?',
    field: 'hasNPS',
    type: 'boolean',
    impactOnScore: 5,
    category: 'retirement',
  },
  {
    id: 'q_retirement_age',
    question: 'At what age do you want to retire?',
    field: 'retirementAge',
    type: 'select',
    options: ['45', '50', '55', '60', '65'],
    impactOnScore: 7,
    category: 'retirement',
  },
  {
    id: 'q_home_loan',
    question: 'Do you have a home loan?',
    field: 'hasHomeLoan',
    type: 'boolean',
    impactOnScore: 5,
    category: 'debt',
  },
  {
    id: 'q_monthly_investments',
    question: 'How much do you invest monthly (SIPs, stocks, FD, etc.)?',
    field: 'investmentAmount',
    type: 'number',
    unit: '₹',
    impactOnScore: 8,
    category: 'investments',
  },
  {
    id: 'q_risk_profile',
    question: 'How would you describe your investment risk appetite?',
    field: 'riskProfile',
    type: 'select',
    options: ['Conservative', 'Moderate', 'Aggressive'],
    impactOnScore: 5,
    category: 'investments',
  },
  {
    id: 'q_city',
    question: 'Which city do you live in? (Important for HRA calculation)',
    field: 'city',
    type: 'select',
    options: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Other Metro', 'Non-Metro'],
    impactOnScore: 5,
    category: 'tax',
  },
]

// Get next unanswered question for user
export async function getNextQuestion(
  userId: string,
  answeredFields: string[]
): Promise<SmartQuestion | null> {
  try {
    await connectDB()
    const memory = await UserMemory.findOne({ userId }).lean()
    const profile = memory?.profile ?? {}

    // Find highest-impact unanswered question
    const unanswered = QUESTION_BANK.filter(q => {
      const alreadyAnswered = answeredFields.includes(q.field)
      const inProfile = profile[q.field as keyof typeof profile] !== undefined
      return !alreadyAnswered && !inProfile
    }).sort((a, b) => b.impactOnScore - a.impactOnScore)

    return unanswered[0] ?? null
  } catch {
    return null
  }
}

// Save answer to user memory
export async function saveQuestionAnswer(
  userId: string,
  field: string,
  value: unknown
): Promise<void> {
  try {
    await connectDB()
    await UserMemory.findOneAndUpdate(
      { userId },
      { $set: { [`profile.${field}`]: value } },
      { upsert: true }
    )
  } catch { /* non-critical */ }
}

// Get all questions with answered status
export function getAllQuestionsWithStatus(
  answeredFields: string[]
): Array<SmartQuestion & { answered: boolean }> {
  return QUESTION_BANK.map(q => ({
    ...q,
    answered: answeredFields.includes(q.field),
  }))
}