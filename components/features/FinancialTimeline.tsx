'use client'
import { useState, useEffect } from 'react'
import { Clock, CheckCircle2, X, AlertCircle, Loader2 } from 'lucide-react'

interface TimelineEntry {
  _id: string
  actionTaken: string
  recommendation: string
  category: string
  impact: string
  status: 'recommended' | 'acted' | 'ignored' | 'pending'
  createdAt: string
}

const catColors: Record<string, string> = {
  sip: 'bg-emerald-500', tax: 'bg-amber-500', insurance: 'bg-blue-500',
  portfolio: 'bg-purple-500', debt: 'bg-rose-500', goal: 'bg-cyan-500', general: 'bg-gray-500',
}
const statusIcon = {
  acted:       <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  recommended: <AlertCircle className="w-4 h-4 text-amber-500" />,
  ignored:     <X className="w-4 h-4 text-muted-foreground" />,
  pending:     <Clock className="w-4 h-4 text-blue-500" />,
}

export default function FinancialTimeline({ limit = 8 }: { limit?: number }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/timeline')
      .then(r => r.json())
      .then(d => setEntries(d.timeline ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading timeline...
    </div>
  )

  if (entries.length === 0) return (
    <div className="text-sm text-muted-foreground text-center py-6">
      No financial actions recorded yet. Run an analysis to get started.
    </div>
  )

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-4">
        {entries.slice(0, limit).map((entry, i) => (
          <div key={entry._id} className="relative flex gap-4 pl-10">
            {/* Dot */}
            <div className={`absolute left-[11px] w-4 h-4 rounded-full border-2 border-background ${catColors[entry.category] ?? 'bg-gray-500'} z-10`} />

            <div className="flex-1 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {statusIcon[entry.status]}
                    <span className="font-medium text-sm">{entry.recommendation}</span>
                  </div>
                  {entry.impact && (
                    <div className="text-xs text-emerald-500 font-medium">{entry.impact}</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full text-white ${catColors[entry.category]}`}>
                  {entry.category}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                  ${entry.status === 'acted' ? 'bg-emerald-500/10 text-emerald-500'
                  : entry.status === 'ignored' ? 'bg-secondary text-muted-foreground'
                  : 'bg-amber-500/10 text-amber-500'}`}>
                  {entry.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}