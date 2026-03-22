'use client'
import { useState, useMemo } from 'react'
import { BarChart3, Plus, Trash2, RefreshCw } from 'lucide-react'
import { useAgent } from '@/hooks/useAgent'
import AgentPipeline from '@/components/ui/AgentPipeline'
import { autoRebalance } from '@/lib/autoRebalance'
import ImpactDashboard from '@/components/ui/ImpactDashboard'
import { formatCurrency } from '@/tools/financialTools'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899']

const ACTION_STYLE: Record<string, string> = {
  sell: 'text-rose-500 bg-rose-500/10',
  reduce: 'text-amber-500 bg-amber-500/10',
  hold: 'text-blue-500 bg-blue-500/10',
  increase: 'text-emerald-500 bg-emerald-500/10',
  add: 'text-purple-500 bg-purple-500/10',
}

interface Fund {
  name: string; category: string
  investedAmount: number; currentValue: number
  units: number; nav: number; expenseRatio: number
}

const mkFund = (): Fund => ({
  name: '', category: 'Large Cap',
  investedAmount: 100000, currentValue: 115000,
  units: 1000, nav: 115, expenseRatio: 1.0,
})

export default function PortfolioPage() {
  const { loading, result, error, stepTrace, run, reset } = useAgent()
  const [funds, setFunds] = useState<Fund[]>([
    { name: 'Mirae Asset Large Cap Fund', category: 'Large Cap', investedAmount: 200000, currentValue: 240000, units: 2000, nav: 120, expenseRatio: 0.54 },
    { name: 'Parag Parikh Flexi Cap', category: 'Flexi Cap', investedAmount: 300000, currentValue: 390000, units: 3000, nav: 130, expenseRatio: 0.63 },
    { name: 'Axis Small Cap Fund', category: 'Small Cap', investedAmount: 100000, currentValue: 145000, units: 800, nav: 181.25, expenseRatio: 0.52 },
  ])
  const [riskProfile, setRiskProfile] = useState('moderate')
  const [horizon, setHorizon] = useState(10)

  function updateFund(i: number, k: keyof Fund, v: string | number) {
    setFunds(f => f.map((fund, idx) => idx === i ? { ...fund, [k]: v } : fund))
  }

  async function handleSubmit() {
    await run('portfolio_xray', {
      funds,
      riskProfile,
      investmentHorizon: horizon,
    })
  }

  const pm = result?.analysis?.portfolioMetrics
  const plan = result?.plan
  const rebalance = useMemo(() => {
    if (!result) return null
    return autoRebalance(funds, riskProfile)
  }, [result, funds, riskProfile])
  const allocData = pm ? Object.entries(pm.categoryBreakdown).map(([name, value]) => ({ name, value })) : []

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-cyan-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Portfolio X-Ray</h1>
          <p className="text-muted-foreground text-sm">Live NAV from AMFI · Overlap analysis · AI rebalancing</p>
        </div>
      </div>

      {!result && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Invested', value: formatCurrency(funds.reduce((s, f) => s + f.investedAmount, 0)) },
              { label: 'Current Value', value: formatCurrency(funds.reduce((s, f) => s + f.currentValue, 0)) },
              { label: 'Return', value: `${(((funds.reduce((s,f)=>s+f.currentValue,0) - funds.reduce((s,f)=>s+f.investedAmount,0)) / Math.max(1, funds.reduce((s,f)=>s+f.investedAmount,0))) * 100).toFixed(1)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="glass-card rounded-xl p-3 text-center">
                <div className="font-display font-bold text-lg gradient-text">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          {/* Fund list */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">Your Funds</h3>
              <button onClick={() => setFunds(f => [...f, mkFund()])} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {funds.map((fund, i) => (
              <div key={i} className="p-3 bg-secondary rounded-xl space-y-2">
                <div className="flex gap-2">
                  <input value={fund.name} onChange={e => updateFund(i, 'name', e.target.value)}
                    placeholder="Fund name" className="input-field flex-1 bg-background text-sm py-2" />
                  <select value={fund.category} onChange={e => updateFund(i, 'category', e.target.value)}
                    className="input-field w-32 bg-background text-sm py-2">
                    {['Large Cap','Mid Cap','Small Cap','Flexi Cap','ELSS','Debt','Hybrid','Index','Sectoral'].map(c => <option key={c}>{c}</option>)}
                  </select>
                  <button onClick={() => setFunds(f => f.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Invested (₹)', key: 'investedAmount' },
                    { label: 'Current (₹)', key: 'currentValue' },
                    { label: 'NAV (₹)', key: 'nav' },
                    { label: 'Exp. Ratio %', key: 'expenseRatio' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-xs text-muted-foreground">{label}</label>
                      <input type="number" step={key === 'expenseRatio' ? '0.01' : '1'}
                        value={fund[key as keyof Fund]}
                        onChange={e => updateFund(i, key as keyof Fund, Number(e.target.value))}
                        className="input-field bg-background text-sm py-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-end gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Risk Profile</label>
              <select value={riskProfile} onChange={e => setRiskProfile(e.target.value)} className="input-field">
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Horizon (yrs)</label>
              <input type="number" value={horizon} onChange={e => setHorizon(Number(e.target.value))} className="input-field w-24" />
            </div>
            <button onClick={handleSubmit} disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Agents Running...' : '🔬 X-Ray Portfolio'}
            </button>
          </div>
          {error && <div className="text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
        </div>
      )}

      {(loading || stepTrace.length > 0) && !result && (
        <AgentPipeline steps={stepTrace} loading={loading} />
      )}

      {result && pm && (
        <div className="space-y-5 animate-fade-in">
          <button onClick={reset} className="btn-secondary text-sm">← Re-analyze</button>

          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'XIRR', value: `${pm.xirr.toFixed(1)}%`, good: pm.xirr >= 12 },
              { label: 'Overlap Score', value: `${pm.overlap.overlapScore}/100`, good: pm.overlap.overlapScore < 30 },
              { label: 'Expense Drag', value: `${pm.averageExpenseRatio}%/yr`, good: pm.averageExpenseRatio < 1 },
              { label: 'Diversification', value: `${pm.overlap.diversificationScore}/100`, good: pm.overlap.diversificationScore > 60 },
            ].map(({ label, value, good }) => (
              <div key={label} className="stat-card">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className={`font-display text-xl font-bold ${good ? 'text-emerald-500' : 'text-amber-500'}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Allocation pie */}
            {allocData.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <h3 className="font-display font-semibold mb-3">Category Allocation</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={allocData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {allocData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Legend iconSize={10} />
                    <Tooltip formatter={(v: number) => [`${v}%`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Overlap warnings */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <h3 className="font-display font-semibold">Overlap Analysis</h3>
              <div className="space-y-2">
                {pm.overlap.duplicateCategories.length > 0 ? (
                  pm.overlap.duplicateCategories.map(cat => (
                    <div key={cat} className="text-sm text-amber-500 bg-amber-500/10 rounded-lg px-3 py-2">
                      ⚠ Multiple funds in <strong>{cat}</strong>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-emerald-500 bg-emerald-500/10 rounded-lg px-3 py-2">
                    ✓ No duplicate categories detected
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Annual expense drag: <strong>{formatCurrency(pm.overlap.totalExpenseAnnual)}</strong>
                </div>
              </div>
            </div>
          </div>

          <ImpactDashboard
            metrics={result.impactDashboard}
            riskFlags={result.riskFlags}
            adjustments={result.adjustments}
            auditSummary={result.auditSummary}
          />

          {/* Rebalancing */}
          {plan?.rebalancingPlan && plan.rebalancingPlan.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display font-semibold mb-4">Rebalancing Plan</h3>
              <div className="space-y-2">
                {plan.rebalancingPlan.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-secondary rounded-xl">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 capitalize ${ACTION_STYLE[r.action] ?? 'bg-secondary text-foreground'}`}>
                      {r.action}
                    </span>
                    <div>
                      <div className="font-medium text-sm">{r.fund}</div>
                      <div className="text-xs text-muted-foreground">{r.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto-Rebalancing Engine */}
          {rebalance && rebalance.needsRebalancing && (
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-500" />
                  Auto-Rebalancing Suggestions
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                  ${rebalance.imbalanceScore > 50 ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  Drift: {rebalance.imbalanceScore}/100
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{rebalance.summary}</p>
              {rebalance.expenseSavings > 0 && (
                <div className="bg-emerald-500/10 rounded-xl px-4 py-2 mb-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  💰 Switching to index funds saves ₹{rebalance.expenseSavings.toLocaleString('en-IN')}/year in expense ratios
                </div>
              )}
              <div className="space-y-2">
                {rebalance.moves.map((move, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-secondary rounded-xl">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 mt-0.5
                      ${move.urgency === 'immediate' ? 'bg-rose-500/10 text-rose-500' : move.urgency === 'this-month' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {move.urgency}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        Move ₹{move.amount.toLocaleString('en-IN')} from <span className="text-rose-500">{move.from}</span> → <span className="text-emerald-500">{move.to}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{move.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan?.explainability && (
            <div className="glass-card rounded-2xl p-4 border border-primary/20">
              <div className="text-xs font-semibold text-primary mb-1">Agent Reasoning</div>
              <p className="text-xs text-muted-foreground">{plan.explainability}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}