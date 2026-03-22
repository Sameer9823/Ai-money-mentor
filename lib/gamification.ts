import { connectDB } from '@/lib/db'
import GamificationModel, { IBadge } from '@/models/Gamification'

export interface BadgeDefinition {
  id: string
  name: string
  description: string
  icon: string
  condition: (stats: UserStats) => boolean
}

export interface UserStats {
  healthScore: number
  reportsGenerated: number
  goalsCreated: number
  goalsCompleted: number
  daysActive: number
  investmentAmount: number
  has80CMaxed: boolean
  hasTermInsurance: boolean
  hasEmergencyFund: boolean
  savingsStreak: number
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_report',
    name: 'First Step',
    description: 'Generated your first financial report',
    icon: '🎯',
    condition: s => s.reportsGenerated >= 1,
  },
  {
    id: 'health_warrior',
    name: 'Health Warrior',
    description: 'Achieved a Money Health Score above 70',
    icon: '💪',
    condition: s => s.healthScore >= 70,
  },
  {
    id: 'tax_saver',
    name: 'Tax Saver',
    description: 'Maxed out 80C investments',
    icon: '🧾',
    condition: s => s.has80CMaxed,
  },
  {
    id: 'insurance_pro',
    name: 'Insurance Pro',
    description: 'Got term life insurance coverage',
    icon: '🛡️',
    condition: s => s.hasTermInsurance,
  },
  {
    id: 'emergency_ready',
    name: 'Emergency Ready',
    description: 'Built a 6-month emergency fund',
    icon: '🏦',
    condition: s => s.hasEmergencyFund,
  },
  {
    id: 'goal_setter',
    name: 'Goal Setter',
    description: 'Created 3 or more financial goals',
    icon: '🎯',
    condition: s => s.goalsCreated >= 3,
  },
  {
    id: 'goal_crusher',
    name: 'Goal Crusher',
    description: 'Completed a financial goal',
    icon: '🏆',
    condition: s => s.goalsCompleted >= 1,
  },
  {
    id: 'streak_7',
    name: '7-Day Streak',
    description: 'Checked your finances 7 days in a row',
    icon: '🔥',
    condition: s => s.savingsStreak >= 7,
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: '30-day savings check streak',
    icon: '⭐',
    condition: s => s.savingsStreak >= 30,
  },
  {
    id: 'investor',
    name: 'Serious Investor',
    description: 'Investing more than ₹10,000 per month',
    icon: '📈',
    condition: s => s.investmentAmount >= 10000,
  },
]

const LEVELS = [
  { level: 1, name: 'Beginner Investor',     minPoints: 0    },
  { level: 2, name: 'Savings Starter',       minPoints: 100  },
  { level: 3, name: 'Budget Builder',        minPoints: 250  },
  { level: 4, name: 'Smart Saver',           minPoints: 500  },
  { level: 5, name: 'Investment Apprentice', minPoints: 1000 },
  { level: 6, name: 'Financial Planner',     minPoints: 2000 },
  { level: 7, name: 'Wealth Builder',        minPoints: 3500 },
  { level: 8, name: 'Money Master',          minPoints: 5000 },
]

export async function updateGamification(
  userId: string,
  stats: UserStats
): Promise<{ newBadges: IBadge[]; levelUp: boolean; newLevel?: string; points: number }> {
  try {
    await connectDB()

    const existing = await GamificationModel.findOne({ userId })
    const earnedIds = existing?.badges.map(b => b.id) ?? []

    // Check new badges
    const newBadges: IBadge[] = []
    for (const def of BADGE_DEFINITIONS) {
      if (!earnedIds.includes(def.id) && def.condition(stats)) {
        newBadges.push({
          id: def.id,
          name: def.name,
          description: def.description,
          icon: def.icon,
          earnedAt: new Date(),
        })
      }
    }

    // Points
    const badgePoints = newBadges.length * 50
    const streakPoints = stats.savingsStreak > 0 ? Math.min(stats.savingsStreak, 30) : 0
    const reportPoints = 10
    const totalPoints = (existing?.totalPoints ?? 0) + badgePoints + streakPoints + reportPoints

    // Level
    const currentLevel = LEVELS.filter(l => totalPoints >= l.minPoints).pop() ?? LEVELS[0]
    const prevLevel = existing?.level ?? 1
    const levelUp = currentLevel.level > prevLevel

    // Update streak
    const today = new Date().toISOString().split('T')[0]
    const lastCheckin = existing?.lastCheckin ?? ''
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newStreak = lastCheckin === yesterday
      ? (existing?.savingsStreak ?? 0) + 1
      : lastCheckin === today
      ? existing?.savingsStreak ?? 1
      : 1
    const longestStreak = Math.max(existing?.longestStreak ?? 0, newStreak)

    await GamificationModel.findOneAndUpdate(
      { userId },
      {
        $push: newBadges.length > 0 ? { badges: { $each: newBadges } } : {},
        $set: {
          totalPoints,
          level: currentLevel.level,
          levelName: currentLevel.name,
          savingsStreak: newStreak,
          longestStreak,
          lastCheckin: today,
        },
      },
      { upsert: true, new: true }
    )

    return { newBadges, levelUp, newLevel: levelUp ? currentLevel.name : undefined, points: totalPoints }
  } catch {
    return { newBadges: [], levelUp: false, points: 0 }
  }
}

export async function getGamification(userId: string) {
  try {
    await connectDB()
    return await GamificationModel.findOne({ userId }).lean()
  } catch {
    return null
  }
}