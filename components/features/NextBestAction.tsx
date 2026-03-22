'use client'
import { useState, useEffect } from 'react'
import { Zap, ChevronRight, CheckCircle2, X, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/tools/financialTools'

interface Action {
  action: string
  impact: string
  priority: 'high' | 'medium' | 'low'
  reason: string
  category: string
  estimatedValue?: number
  confidenceScore: number
  dataPointsUsed: string[]
}

interface ConfidenceScore {
  score: number
  missingFields: string[]
  suggestions: string[]
}

const priorityColors = {
  high:   'border-rose-500 bg-rose-500/5',
  medium: 'border-amber-500 bg-amber-500/5',
  low:    'border-emerald-500 bg-emerald-500/5',
}
const priorityBadge = {
  high:   'bg-rose-500/10 text-rose-500',
  medium: 'bg-amber-500/10 text-amber-500',
  low:    'bg-emerald-500/10 text-emerald-500',
}

export default function NextBestActionCard() {
  const [action, setAction] = useState<Action | null>(null)
  const [confidence, setConfidence] = useState<ConfidenceScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    fetch('/api/actions')
      .then(r => r.json())
      .then(d => { setAction(d.action); setConfidence(d.confidenceScore) })
      .finally(() => setLoading(false))
  }, [])

  async function handleAction(status: 'acted' | 'ignored') {
    if (!action) return
    setActing(true)
    await fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, status }),
    })
    setDismissed(true)
    setActing(false)
  }

  if (dismissed) return null

  return (
    <div className={`glass-card rounded-2xl p-5 border-l-4 ${action ? priorityColors[action.priority] : 'border-primary'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="font-display font-semibold text-sm">Next Best Action</span>
        </div>
        {action && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${priorityBadge[action.priority]}`}>
            {action.priority.toUpperCase()} PRIORITY
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Analyzing your finances...
        </div>
      )}

      {!loading && !action && (
        <div className="text-sm text-muted-foreground">
          Complete your financial profile to get personalized recommendations.
        </div>
      )}

      {!loading && action && (
        <>
          <div className="mb-3">
            <p className="font-semibold text-base mb-1">{action.action}</p>
            <p className="text-sm text-emerald-500 font-medium">{action.impact}</p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{action.reason}</p>
          </div>

          {/* Data points used */}
          {action.dataPointsUsed.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {action.dataPointsUsed.slice(0, 3).map((dp, i) => (
                <span key={i} className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                  {dp}
                </span>
              ))}
            </div>
          )}

          {/* Confidence */}
          {confidence && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Analysis confidence</span>
                <span className="font-semibold">{confidence.score}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full"
                  style={{ width: `${confidence.score}%` }}
                />
              </div>
              {confidence.missingFields.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Add: {confidence.missingFields.slice(0, 2).join(', ')} to improve accuracy
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleAction('acted')}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white text-xs py-2 px-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              I'll do this
            </button>
            <button
              onClick={() => handleAction('ignored')}
              disabled={acting}
              className="flex items-center gap-1 bg-secondary text-muted-foreground text-xs py-2 px-3 rounded-xl hover:bg-secondary/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Skip
            </button>
          </div>
        </>
      )}
    </div>
  )
}