'use client'
import { useState, useMemo } from 'react'
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'
import { useAgent } from '@/hooks/useAgent'
import AgentPipeline from '@/components/ui/AgentPipeline'
import ImpactDashboard from '@/components/ui/ImpactDashboard'
import { formatCurrency } from '@/tools/financialTools'
import { generateFireRoadmap, formatCr } from '@/lib/fireRoadmap'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6b7280']

export default function FirePlannerPage() {
  const { loading, result, error, stepTrace, run, reset } = useAgent()
  const [showFullRoadmap, setShowFullRoadmap] = useState(false)
  const [form, setForm] = useState({
    age: 28, retirementAge: 45, monthlyIncome: 80000,
    monthlyExpenses: 40000, currentSavings: 200000,
    currentInvestments: 500000, goals: 'retirement, house purchase',
    riskProfile: 'moderate',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = await run('fire_plan', form)
    if (data) {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          income:   { monthly: form.monthlyIncome },
          expenses: { monthly: form.monthlyExpenses },
          personal: { age: form.age, retirementAge: form.retirementAge, riskProfile: form.riskProfile },
          savings:  { total: form.currentSavings },
          investments: { total: form.currentInvestments },
        }),
      }).catch(() => {})
      await fetch('/api/profile/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retirementReadiness: data.impactDashboard?.retirementReadiness ?? 0,
          taxSaved: data.impactDashboard?.taxSaved ?? 0,
        }),
      }).catch(() => {})
    }
  }

  const plan     = result?.plan
  const analysis = result?.analysis?.fireMetrics
  const alloc    = plan?.assetAllocation

  const roadmap = useMemo(() => {
    if (!result || !analysis) return null
    return generateFireRoadmap({
      age:             form.age,
      retirementAge:   form.retirementAge,
      monthlyIncome:   form.monthlyIncome,
      monthlyExpenses: form.monthlyExpenses,
      currentSavings:  form.currentSavings + form.currentInvestments,
      monthlySIP:      analysis.requiredSIP ?? Math.round((form.monthlyIncome - form.monthlyExpenses) * 0.5),
      riskProfile:     form.riskProfile,
    })
  }, [result, analysis, form])
  const allocData = alloc ? [
    { name: 'Equity', value: alloc.equity },
    { name: 'Debt', value: alloc.debt },
    { name: 'Gold', value: alloc.gold },
    { name: 'Cash', value: alloc.cash },
  ].filter(d => d.value > 0) : []

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">FIRE Path Planner</h1>
          <p className="text-muted-foreground text-sm">7-agent autonomous pipeline · Memory-aware recommendations</p>
        </div>
      </div>

      {/* Form */}
      {!result && (
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-5">
          <h2 className="font-display font-semibold">Your Financial Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Age', key: 'age' }, { label: 'Target Retirement Age', key: 'retirementAge' },
              { label: 'Monthly Income (₹)', key: 'monthlyIncome' }, { label: 'Monthly Expenses (₹)', key: 'monthlyExpenses' },
              { label: 'Current Savings (₹)', key: 'currentSavings' }, { label: 'Current Investments (₹)', key: 'currentInvestments' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-sm font-medium block mb-1.5">{label}</label>
                <input type="number" value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                  className="input-field" />
              </div>
            ))}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Financial Goals</label>
            <input value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))}
              placeholder="retirement, house, child education" className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Risk Profile</label>
            <div className="flex gap-3">
              {(['conservative', 'moderate', 'aggressive'] as const).map(r => (
                <button type="button" key={r} onClick={() => setForm(f => ({ ...f, riskProfile: r }))}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium capitalize transition-all ${form.riskProfile === r ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50 w-full justify-center">
            {loading ? 'Running Agent Pipeline...' : '🚀 Run FIRE Planning Agents'}
          </button>
        </form>
      )}

      {/* Live pipeline */}
      {(loading || stepTrace.length > 0) && !result && (
        <AgentPipeline steps={stepTrace} loading={loading} />
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          <button onClick={reset} className="btn-secondary text-sm">← Recalculate</button>

          {/* Summary */}
          <div className="glass-card rounded-2xl p-5">
            <p className="text-sm leading-relaxed">{result.summary}</p>
          </div>

          {/* Impact */}
          <ImpactDashboard
            metrics={result.impactDashboard}
            riskFlags={result.riskFlags}
            adjustments={result.adjustments}
            auditSummary={result.auditSummary}
          />

          {/* Key metrics */}
          {analysis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Required Monthly SIP', value: formatCurrency(analysis.requiredSIP) },
                { label: 'Retirement Corpus Needed', value: formatCurrency(analysis.retirementCorpusNeeded) },
                { label: 'Years to FIRE', value: `${analysis.yearsToRetirement} yrs` },
                { label: 'Savings Rate', value: `${analysis.savingsRate}%` },
              ].map(({ label, value }) => (
                <div key={label} className="stat-card">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="font-display text-xl font-bold gradient-text">{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Charts */}
          {analysis?.projections && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display font-semibold mb-4">Corpus Projection</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={analysis.projections}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Corpus']} />
                  <Area type="monotone" dataKey="corpus" stroke="#10b981" fill="url(#grad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5">
            {/* Asset allocation */}
            {allocData.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <h3 className="font-display font-semibold mb-3">Asset Allocation</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={allocData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {allocData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend iconSize={10} />
                    <Tooltip formatter={(v: number) => [`${v}%`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* SIP Plan */}
            {plan?.sipPlan && plan.sipPlan.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <h3 className="font-display font-semibold mb-3">SIP Breakdown</h3>
                <div className="space-y-2">
                  {plan.sipPlan.map((s, i) => (
                    <div key={i} className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium">{s.instrument}</div>
                        <div className="text-xs text-muted-foreground">{s.category} · {s.rationale}</div>
                      </div>
                      <div className="font-mono text-sm font-bold text-primary shrink-0 ml-2">{formatCurrency(s.amount)}/mo</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action items */}
          {plan?.actionItems && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display font-semibold mb-3">Action Plan</h3>
              <div className="space-y-2">
                {plan.actionItems.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 mt-0.5 font-medium
                      ${a.priority === 'high' ? 'bg-rose-500/10 text-rose-500' : a.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {a.priority}
                    </span>
                    <div>
                      <div className="text-sm">{a.action}</div>
                      <div className="text-xs text-muted-foreground">{a.timeline}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {plan?.insights && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display font-semibold mb-3">💡 Key Insights</h3>
              <div className="space-y-2">
                {plan.insights.map((ins, i) => (
                  <div key={i} className="text-sm flex gap-2">
                    <span className="text-primary font-bold">{i + 1}.</span> {ins}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Month-by-Month Roadmap */}
          {roadmap && (
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-semibold">Year-by-Year Roadmap</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Corpus growth · SIP step-up · Asset allocation glide path
                  </p>
                </div>
                <div className={`text-xs px-3 py-1.5 rounded-full font-semibold
                  ${roadmap.achievesGoal ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {roadmap.achievesGoal
                    ? `Goal achieved at age ${roadmap.yearAchieved}`
                    : `Gap: ${formatCr(roadmap.requiredCorpus - roadmap.finalCorpus)}`}
                </div>
              </div>

              {/* Target vs Final */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-secondary rounded-xl p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Required Corpus</div>
                  <div className="font-display font-bold text-lg text-rose-500">{formatCr(roadmap.requiredCorpus)}</div>
                </div>
                <div className="bg-secondary rounded-xl p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Projected Corpus</div>
                  <div className={`font-display font-bold text-lg ${roadmap.achievesGoal ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {formatCr(roadmap.finalCorpus)}
                  </div>
                </div>
              </div>

              {/* Milestones table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Year</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Age</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Corpus</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">SIP/mo</th>
                      <th className="text-center py-2 text-muted-foreground font-medium">Equity</th>
                      <th className="text-left py-2 text-muted-foreground font-medium pl-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showFullRoadmap ? roadmap.milestones : roadmap.milestones.filter((_, i) =>
                      i === 0 || i === 2 || i === 4 || (i + 1) % 5 === 0 || i === roadmap.milestones.length - 1
                    )).map((m) => (
                      <tr key={m.year} className={`border-b border-border/50 hover:bg-secondary/50 transition-colors
                        ${m.corpus >= roadmap.requiredCorpus ? 'bg-emerald-500/5' : ''}`}>
                        <td className="py-2.5 font-semibold text-primary">Y{m.year}</td>
                        <td className="py-2.5 text-muted-foreground">{m.age}</td>
                        <td className="py-2.5 text-right font-bold">{formatCr(m.corpus)}</td>
                        <td className="py-2.5 text-right text-emerald-500">{formatCr(m.sipAmount)}</td>
                        <td className="py-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium
                            ${m.equityPct >= 70 ? 'bg-emerald-500/10 text-emerald-500'
                            : m.equityPct >= 50 ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-blue-500/10 text-blue-500'}`}>
                            {m.equityPct}%
                          </span>
                        </td>
                        <td className="py-2.5 text-muted-foreground pl-3 max-w-[200px] truncate">{m.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => setShowFullRoadmap(v => !v)}
                className="mt-3 text-xs text-primary flex items-center gap-1 hover:underline"
              >
                {showFullRoadmap ? <><ChevronUp className="w-3 h-3" /> Show summary</> : <><ChevronDown className="w-3 h-3" /> Show all {roadmap.milestones.length} years</>}
              </button>
            </div>
          )}

          {/* Explainability */}
          {plan?.explainability && (
            <div className="glass-card rounded-2xl p-4 border border-primary/20">
              <div className="text-xs font-semibold text-primary mb-1">Why this recommendation?</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{plan.explainability}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}