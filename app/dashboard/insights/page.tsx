'use client'
import { BarChart2, Clock, Trophy } from 'lucide-react'
import BenchmarkWidget from '@/components/features/BenchmarkWidget'
import FinancialTimeline from '@/components/features/FinancialTimeline'
import GamificationWidget from '@/components/features/GamificationWidget'
import RiskHeatmap from '@/components/features/RiskHeatmap'
import AlertsWidget from '@/components/features/AlertsWidget'

export default function InsightsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Insights & Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Benchmarks, risk analysis, timeline, and your progress</p>
      </div>

      {/* Smart Alerts */}
      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
          🔔 Smart Alerts
        </h2>
        <AlertsWidget />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Benchmark */}
        <BenchmarkWidget />

        {/* Risk Heatmap */}
        <RiskHeatmap />
      </div>

      {/* Gamification */}
      <GamificationWidget />

      {/* Timeline */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-4 h-4 text-primary" />
          <h2 className="font-display font-semibold">Financial Decision Timeline</h2>
        </div>
        <FinancialTimeline limit={12} />
      </div>
    </div>
  )
}