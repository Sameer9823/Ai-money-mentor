import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import FinancialProfile from '@/models/FinancialProfile'
import { getNextQuestion, saveQuestionAnswer } from '@/agents/questionAgent'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    await connectDB()

    const profile = await FinancialProfile.findOne({ userId }).lean()
    const answeredFields: string[] = []

    // Build list of already-answered fields from profile
    if (profile) {
      if (profile.insurance?.hasTermInsurance !== undefined) answeredFields.push('hasTermInsurance')
      if (profile.insurance?.hasHealthInsurance !== undefined) answeredFields.push('hasHealthInsurance')
      if (profile.savings?.emergencyMonths) answeredFields.push('emergencyFundMonths')
      if (profile.tax?.section80C) answeredFields.push('section80C')
      if (profile.personal?.retirementAge) answeredFields.push('retirementAge')
      if (profile.personal?.riskProfile) answeredFields.push('riskProfile')
      if (profile.personal?.city) answeredFields.push('city')
      if (profile.investments?.total) answeredFields.push('investmentAmount')
    }

    const question = await getNextQuestion(userId, answeredFields)
    return NextResponse.json({ question })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id ?? session.user.email!
    const { field, value } = await req.json()

    await connectDB()

    // Save to financial profile
    const fieldMap: Record<string, string> = {
      hasTermInsurance:    'insurance.hasTermInsurance',
      hasHealthInsurance:  'insurance.hasHealthInsurance',
      emergencyFundMonths: 'savings.emergencyMonths',
      section80C:          'tax.section80C',
      retirementAge:       'personal.retirementAge',
      riskProfile:         'personal.riskProfile',
      city:                'personal.city',
      investmentAmount:    'investments.monthlyAmount',
    }

    const dbField = fieldMap[field]
    if (dbField) {
      await FinancialProfile.findOneAndUpdate(
        { userId },
        { $set: { [dbField]: value } },
        { upsert: true }
      )
    }

    await saveQuestionAnswer(userId, field, value)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}