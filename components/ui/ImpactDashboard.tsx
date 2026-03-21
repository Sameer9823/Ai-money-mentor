'use client'
import { TrendingUp, IndianRupee, Shield, BarChart2 } from 'lucide-react'

interface ImpactDashboardProps {
  metrics: {
    taxSaved: number
    portfolioImprovement: number
    retirementReadiness: number
    netWorthGrowth: number
    formattedTaxSaved: string
    formattedNetWorthGrowth: string
  }
  riskFlags?: string[]
  adjustments?: string[]
  auditSummary?: {
    agentsRun: string[]
    totalSteps: number
    dataQuality: string
    retries: number
  }
}

export default function ImpactDashboard({ metrics, riskFlags, adjustments, auditSummary }: ImpactDashboardProps) {
  return (
    <div className="space-y-4">
      {/* Impact metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Tax Saved',
            value: metrics.formattedTaxSaved,
            icon: IndianRupee,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            show: metrics.taxSaved > 0,
          },
          {
            label: 'Portfolio Return',
            value: `${metrics.portfolioImprovement.toFixed(1)}%`,
            icon: BarChart2,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            show: metrics.portfolioImprovement > 0,
          },
          {
            label: 'Retirement Readiness',
            value: `${metrics.retirementReadiness}%`,
            icon: Shield,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
            show: metrics.retirementReadiness > 0,
          },
          {
            label: 'Projected Net Worth Growth',
            value: metrics.formattedNetWorthGrowth,
            icon: TrendingUp,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            show: metrics.netWorthGrowth > 0,
          },
        ]
          .filter(m => m.show)
          .map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass-card rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className={`font-display text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
      </div>

      {/* Risk flags */}
      {riskFlags && riskFlags.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-amber-500/20">
          <div className="text-xs font-semibold text-amber-500 mb-2 uppercase tracking-wide">⚠ Risk Flags Detected & Resolved</div>
          {riskFlags.map((flag, i) => (
            <div key={i} className="text-xs text-muted-foreground flex gap-2 mb-1">
              <span className="text-amber-500">•</span> {flag}
            </div>
          ))}
          {adjustments?.map((adj, i) => (
            <div key={i} className="text-xs text-emerald-500 flex gap-2 mt-1">
              <span>✓</span> {adj}
            </div>
          ))}
        </div>
      )}

      {/* Audit summary */}
      {auditSummary && (
        <div className="glass-card rounded-xl p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Agent Audit Trail</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Agents Run', value: auditSummary.agentsRun.length.toString() },
              { label: 'Pipeline Steps', value: auditSummary.totalSteps.toString() },
              { label: 'Data Quality', value: auditSummary.dataQuality },
              { label: 'Retries', value: auditSummary.retries.toString() },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="font-mono font-bold text-sm text-primary">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 mt-3">
            {auditSummary.agentsRun.map(a => (
              <span key={a} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium capitalize">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
