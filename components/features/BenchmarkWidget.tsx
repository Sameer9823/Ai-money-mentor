'use client'
import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'

interface BenchmarkData {
  userReturn: number
  nifty50_1yr: number
  nifty50_3yr: number
  nifty50_5yr: number
  difference: number
  verdict: 'beating' | 'matching' | 'lagging'
  avgIndianInvestorReturn: number
  percentile: string
}

export default function BenchmarkWidget() {
  const [data, setData] = useState<BenchmarkData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/benchmark')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="glass-card rounded-2xl p-5 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" /> Fetching market data...
    </div>
  )

  if (!data) return null

  const VerdictIcon = data.verdict === 'beating' ? TrendingUp
    : data.verdict === 'lagging' ? TrendingDown : Minus

  const verdictColor = data.verdict === 'beating' ? 'text-emerald-500'
    : data.verdict === 'lagging' ? 'text-rose-500' : 'text-amber-500'

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-blue-500" />
        <span className="font-display font-semibold text-sm">vs NIFTY 50 Benchmark</span>
      </div>

      {/* Main comparison */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-secondary rounded-xl p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">Your XIRR</div>
          <div className={`font-display text-2xl font-bold ${data.userReturn > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {data.userReturn > 0 ? '+' : ''}{data.userReturn}%
          </div>
        </div>
        <div className="bg-secondary rounded-xl p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">NIFTY 50 (1yr)</div>
          <div className="font-display text-2xl font-bold text-blue-500">
            +{data.nifty50_1yr}%
          </div>
        </div>
      </div>

      {/* Verdict */}
      <div className={`flex items-center gap-2 p-3 rounded-xl mb-3
        ${data.verdict === 'beating' ? 'bg-emerald-500/10' : data.verdict === 'lagging' ? 'bg-rose-500/10' : 'bg-amber-500/10'}`}>
        <VerdictIcon className={`w-4 h-4 ${verdictColor}`} />
        <div>
          <div className={`text-sm font-semibold ${verdictColor}`}>
            {data.verdict === 'beating' ? `Beating NIFTY by ${Math.abs(data.difference)}%` :
             data.verdict === 'lagging' ? `Lagging NIFTY by ${Math.abs(data.difference)}%` :
             'Matching market returns'}
          </div>
          <div className="text-xs text-muted-foreground">You're in the {data.percentile} of Indian investors</div>
        </div>
      </div>

      {/* Historical NIFTY returns */}
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">NIFTY 50 Historical</div>
        {[
          { label: '1 Year', val: data.nifty50_1yr },
          { label: '3 Year CAGR', val: data.nifty50_3yr },
          { label: '5 Year CAGR', val: data.nifty50_5yr },
          { label: 'Avg Indian Investor', val: data.avgIndianInvestorReturn },
        ].map(({ label, val }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold text-blue-500">+{val}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}