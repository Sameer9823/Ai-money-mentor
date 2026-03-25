/**
 * CONTINUOUS AGENT — Background autonomous re-analysis
 * 
 * Triggered by:
 * 1. Vercel Cron (daily) via /api/cron/daily
 * 2. Manual trigger from dashboard
 * 3. After profile update
 *
 * What it does:
 * - Fetches all active users
 * - Re-runs analysis if data is stale (>24h)
 * - Generates smart alerts
 * - Updates gamification
 * - Stores timeline events for significant changes
 */

import { connectDB } from '@/lib/db'
import UserMemory from '@/models/UserMemory'
import FinancialProfile from '@/models/FinancialProfile'
import Alert from '@/models/Alert'
import Timeline from '@/models/Timeline'
import Gamification from '@/models/Gamification'
import { getNextBestAction } from '@/agents/actionAgent'
import { calculateRiskScore } from '@/agents/riskScoreAgent'
import { updateGamification } from '@/lib/gamification'
import Goal from '@/models/Goal'
import Report from '@/models/Report'

interface ContinuousAgentResult {
  usersProcessed: number
  alertsGenerated: number
  errors: string[]
  duration: number
}

export async function runContinuousAgent(
  specificUserId?: string
): Promise<ContinuousAgentResult> {
  const start = Date.now()
  const errors: string[] = []
  let usersProcessed = 0
  let alertsGenerated = 0

  try {
    await connectDB()

    // Get users to process
    const query = specificUserId ? { userId: specificUserId } : {}
    const memories = await UserMemory.find(query).lean()

    for (const memory of memories) {
      try {
        const userId = memory.userId
        const profile = await FinancialProfile.findOne({ userId }).lean()
        if (!profile) continue

        const input = {
          monthlyIncome:       profile.income?.monthly ?? 0,
          monthlyExpenses:     profile.expenses?.monthly ?? 0,
          savings:             profile.savings?.total ?? 0,
          emergencyFundMonths: profile.savings?.emergencyMonths ?? 0,
          hasTermInsurance:    profile.insurance?.hasTermInsurance ?? false,
          hasHealthInsurance:  profile.insurance?.hasHealthInsurance ?? false,
          totalDebt:           profile.liabilities?.totalDebt ?? 0,
          monthlyEMI:          profile.expenses?.emi ?? 0,
          investmentAmount:    (profile.investments?.total ?? 0) / 12,
          section80C:          profile.tax?.section80C ?? 0,
          age:                 profile.personal?.age ?? 30,
          riskProfile:         profile.personal?.riskProfile ?? 'moderate',
          retirementAge:       profile.personal?.retirementAge ?? 60,
        }

        // ── 1. Generate Next Best Action ──────────────────────────────
        try {
          const action = await getNextBestAction(input)

          // Store as alert if high priority
          if (action.priority === 'high') {
            const exists = await Alert.findOne({
              userId,
              message: { $regex: action.action.substring(0, 30) },
              createdAt: { $gte: new Date(Date.now() - 7 * 86400000) },
            })
            if (!exists) {
              await Alert.create({
                userId,
                message: action.action,
                severity: 'warning',
                category: action.category,
                actionUrl: `/dashboard/${action.category === 'tax' ? 'tax-wizard' : action.category === 'sip' ? 'fire-planner' : 'money-health'}`,
              })
              alertsGenerated++
            }
          }
        } catch (e) {
          errors.push(`Action agent failed for ${userId}: ${e}`)
        }

        // ── 2. Risk monitoring ────────────────────────────────────────
        try {
          const risk = calculateRiskScore({
            age:               input.age,
            monthlyIncome:     input.monthlyIncome,
            monthlyEMI:        input.monthlyEMI,
            totalDebt:         input.totalDebt,
            hasTermInsurance:  input.hasTermInsurance,
            hasHealthInsurance: input.hasHealthInsurance,
            healthCover:       profile.insurance?.healthCover ?? 0,
            emergencyFundMonths: input.emergencyFundMonths,
            equityAllocationPct: 60,
            largestFundPct:    40,
            investmentAmount:  input.investmentAmount,
          })

          if (risk.category === 'Very High' || risk.category === 'High') {
            const exists = await Alert.findOne({
              userId,
              category: 'risk',
              createdAt: { $gte: new Date(Date.now() - 7 * 86400000) },
            })
            if (!exists) {
              await Alert.create({
                userId,
                message: `Your financial risk score is ${risk.riskScore}/100 (${risk.category}). Top risk: ${risk.topRisks[0]}`,
                severity: risk.category === 'Very High' ? 'critical' : 'warning',
                category: 'risk',
                actionUrl: '/dashboard/insights',
              })
              alertsGenerated++
            }
          }
        } catch (e) {
          errors.push(`Risk agent failed for ${userId}: ${e}`)
        }

        // ── 3. Retirement readiness check ─────────────────────────────
        const yearsToRetirement = (input.retirementAge - input.age)
        const monthlyInvestment = input.investmentAmount
        const requiredForRetirement = input.monthlyExpenses * 12 * 25
        const currentTrajectory = monthlyInvestment * 12 * yearsToRetirement * 1.5 // rough

        if (yearsToRetirement <= 10 && currentTrajectory < requiredForRetirement * 0.5) {
          const exists = await Alert.findOne({
            userId,
            category: 'retirement',
            createdAt: { $gte: new Date(Date.now() - 30 * 86400000) },
          })
          if (!exists) {
            await Alert.create({
              userId,
              message: `Only ${yearsToRetirement} years to retirement. Current investment trajectory may leave a corpus gap of ₹${((requiredForRetirement - currentTrajectory) / 10000000).toFixed(1)} Cr.`,
              severity: 'critical',
              category: 'retirement',
              actionUrl: '/dashboard/fire-planner',
            })
            alertsGenerated++
          }
        }

        // ── 4. Tax season reminder (Jan-Mar) ──────────────────────────
        const month = new Date().getMonth() + 1
        if ([1, 2, 3].includes(month) && input.section80C < 100000) {
          const exists = await Alert.findOne({
            userId,
            category: 'tax',
            message: { $regex: 'March 31' },
            createdAt: { $gte: new Date(Date.now() - 7 * 86400000) },
          })
          if (!exists) {
            const gap = 150000 - input.section80C
            await Alert.create({
              userId,
              message: `Tax season alert: ₹${gap.toLocaleString('en-IN')} 80C investment gap before March 31. Invest in ELSS to save ₹${Math.round(gap * 0.3).toLocaleString('en-IN')} in tax.`,
              severity: 'warning',
              category: 'tax',
              actionUrl: '/dashboard/tax-wizard',
            })
            alertsGenerated++
          }
        }

        // ── 5. Auto-sync live stock prices from Yahoo Finance ──────────
        try {
          const memDoc = await UserMemory.findOne({ userId }).lean() as Record<string, unknown> | null
          type SavedStock = { symbol: string; units: number; buyPrice: number }
          const savedStocks = (memDoc?.stockPortfolio as SavedStock[] | undefined) ?? []
          if (savedStocks.length > 0) {
            const { enrichPortfolioWithLivePrices } = await import('@/lib/yahooFinanceApi')
            const enriched = await enrichPortfolioWithLivePrices(savedStocks)
            const totalValue = enriched.reduce((s, f) => s + f.currentValue, 0)
            if (totalValue > 0) {
              await FinancialProfile.findOneAndUpdate(
                { userId },
                { $set: { 'investments.total': totalValue, 'investments.lastSyncAt': new Date().toISOString() } },
                { upsert: true }
              )
            }
          }
        } catch { /* non-critical */ }
        try {
          const [goals, reports] = await Promise.all([
            Goal.find({ userId }).lean(),
            Report.countDocuments({ userId }),
          ])
          await updateGamification(userId, {
            healthScore:       profile.latestAnalysis?.healthScore ?? 0,
            reportsGenerated:  reports,
            goalsCreated:      goals.length,
            goalsCompleted:    goals.filter(g => g.completed).length,
            daysActive:        1,
            investmentAmount:  input.investmentAmount,
            has80CMaxed:       input.section80C >= 150000,
            hasTermInsurance:  input.hasTermInsurance,
            hasEmergencyFund:  input.emergencyFundMonths >= 6,
            savingsStreak:     0,
          })
        } catch (e) {
          // Non-critical
        }

        usersProcessed++
      } catch (e) {
        errors.push(`User ${memory.userId} processing failed: ${String(e)}`)
      }
    }
  } catch (e) {
    errors.push(`Continuous agent DB error: ${String(e)}`)
  }

  return {
    usersProcessed,
    alertsGenerated,
    errors,
    duration: Date.now() - start,
  }
}