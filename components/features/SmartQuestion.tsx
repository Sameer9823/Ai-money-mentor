'use client'
import { useState, useEffect } from 'react'
import { Shield, Loader2 } from 'lucide-react'

interface HeatmapItem {
  label: string
  value: number
  color: string
}

interface RiskData {
  riskScore: number
  category: 'Low' | 'Medium' | 'High' | 'Very High'
  heatmapData: HeatmapItem[]
  topRisks: string[]
  mitigationSteps: string[]
}

const categoryColors = {
  Low:       { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500' },
  Medium:    { bg: 'bg-amber-500/10',   text: 'text-amber-500',   border: 'border-amber-500'   },
  High:      { bg: 'bg-orange-500/10',  text: 'text-orange-500',  border: 'border-orange-500'  },
  'Very High':{ bg: 'bg-rose-500/10',   text: 'text-rose-500',    border: 'border-rose-500'    },
}

export default function RiskHeatmap() {
  const [data, setData] = useState<RiskData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/risk-score')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="glass-card rounded-2xl p-5 flex items-center gap-2 text-muted-foreground text-sm">
      <Loader2 className="w-4 h-4 animate-spin" /> Calculating risk score...
    </div>
  )

  if (!data?.riskScore) return null

  const colors = categoryColors[data.category]

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-orange-500" />
          </div>
          <span className="font-display font-semibold text-sm">Risk Score</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${colors.bg} ${colors.border}`}>
          <span className={`font-display font-bold text-lg ${colors.text}`}>{data.riskScore}</span>
          <span className={`text-xs font-semibold ${colors.text}`}>{data.category}</span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {data.heatmapData.map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-3 text-center"
            style={{ backgroundColor: item.color + '20', borderLeft: `3px solid ${item.color}` }}
          >
            <div className="font-bold text-base" style={{ color: item.color }}>
              {Math.round(item.value)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Top risks */}
      {data.topRisks.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Top Risks</div>
          <div className="space-y-1.5">
            {data.topRisks.map((risk, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-rose-500 font-bold mt-0.5">!</span>
                <span className="text-muted-foreground">{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}