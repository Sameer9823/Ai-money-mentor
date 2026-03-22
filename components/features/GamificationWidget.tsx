'use client'
import { useState, useEffect } from 'react'
import { Trophy, Flame } from 'lucide-react'

interface GamificationData {
  savingsStreak: number
  totalPoints: number
  badges: Array<{ id: string; name: string; icon: string; description: string }>
  level: number
  levelName: string
}

export default function GamificationWidget() {
  const [data, setData] = useState<GamificationData | null>(null)

  useEffect(() => {
    fetch('/api/gamification')
      .then(r => r.ok ? r.json() : { gamification: null })
      .then(d => { if (d.gamification) setData(d.gamification) })
      .catch(() => {})
  }, [])

  if (!data) return null

  const nextLevelPoints = [0, 100, 250, 500, 1000, 2000, 3500, 5000]
  const curThreshold  = nextLevelPoints[Math.max(0, data.level - 1)] ?? 0
  const nextThreshold = nextLevelPoints[data.level] ?? 5000
  const progress = nextThreshold > curThreshold
    ? Math.round(((data.totalPoints - curThreshold) / (nextThreshold - curThreshold)) * 100)
    : 100

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="font-display font-semibold text-sm">Your Progress</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-500">
          <Flame className="w-4 h-4" />
          <span className="font-bold text-sm">{data.savingsStreak}d streak</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold text-primary">Level {data.level} — {data.levelName}</span>
          <span className="text-xs text-muted-foreground">{data.totalPoints} pts</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {Math.max(0, nextThreshold - data.totalPoints)} pts to Level {data.level + 1}
        </p>
      </div>

      {data.badges.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
            Badges ({data.badges.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {data.badges.slice(0, 8).map(badge => (
              <div key={badge.id} title={`${badge.name}: ${badge.description}`}
                className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-lg cursor-help hover:scale-110 transition-transform">
                {badge.icon}
              </div>
            ))}
            {data.badges.length > 8 && (
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                +{data.badges.length - 8}
              </div>
            )}
          </div>
        </div>
      )}
      {data.badges.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Complete actions to earn badges! 🎯</p>
      )}
    </div>
  )
}