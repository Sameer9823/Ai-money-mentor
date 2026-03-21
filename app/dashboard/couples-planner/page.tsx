'use client'
import { useState } from 'react'
import { Users } from 'lucide-react'
import { useAgent } from '@/hooks/useAgent'
import AgentPipeline from '@/components/ui/AgentPipeline'
import ImpactDashboard from '@/components/ui/ImpactDashboard'
import { formatCurrency, formatINR } from '@/tools/financialTools'

export default function CouplesPlannerPage() {
  const { loading, result, error, stepTrace, run, reset } = useAgent()
  const [form, setForm] = useState({
    partner1: { name: 'Partner 1', income: 1200000, age: 30, investments: 500000, hra: 240000, rentCity: 'Mumbai' },
    partner2: { name: 'Partner 2', income: 800000, age: 28, investments: 200000, hra: 160000 },
    monthlyRent: 30000,
    goals: 'home purchase, retirement, child education',
    riskProfile: 'moderate',
  })

  function up1(k: string, v: string | number) { setForm(f => ({ ...f, partner1: { ...f.partner1, [k]: v } })) }
  function up2(k: string, v: string | number) { setForm(f => ({ ...f, partner2: { ...f.partner2, [k]: v } })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await run('couples_plan', {
      ...form,
      goals: typeof form.goals === 'string'
        ? form.goals.split(',').map(g => g.trim()).filter(Boolean)
        : form.goals,
    })
  }

  const plan = result?.plan

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Couple's Financial Planner</h1>
          <p className="text-muted-foreground text-sm">Joint HRA · SIP split · Tax optimization across both incomes</p>
        </div>
      </div>

      {!result && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { label: 'Partner 1', data: form.partner1, update: up1, showCity: true },
              { label: 'Partner 2', data: form.partner2, update: up2, showCity: false },
            ].map(({ label, data, update, showCity }) => (
              <div key={label} className="glass-card rounded-2xl p-5 space-y-3">
                <h3 className="font-display font-semibold">{label}</h3>
                <div>
                  <label className="text-sm font-medium block mb-1">Name</label>
                  <input value={data.name} onChange={e => update('name', e.target.value)} className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Annual Income (₹)', key: 'income' },
                    { label: 'Age', key: 'age' },
                    { label: 'Investments (₹)', key: 'investments' },
                    { label: 'HRA (₹/yr)', key: 'hra' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                      <input type="number" value={(data as Record<string, unknown>)[key] as number}
                        onChange={e => update(key, Number(e.target.value))} className="input-field" />
                    </div>
                  ))}
                </div>
                {showCity && (
                  <div>
                    <label className="text-sm font-medium block mb-1">City (for HRA calc)</label>
                    <input value={(data as { rentCity?: string }).rentCity ?? ''}
                      onChange={e => update('rentCity', e.target.value)} className="input-field" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-semibold">Joint Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Monthly Rent (₹)</label>
                <input type="number" value={form.monthlyRent}
                  onChange={e => setForm(f => ({ ...f, monthlyRent: Number(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Goals</label>
                <input value={form.goals}
                  onChange={e => setForm(f => ({ ...f, goals: e.target.value }))}
                  placeholder="home, retirement, education" className="input-field" />
              </div>
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
          </div>

          {error && <div className="text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
            {loading ? 'Optimizing Joint Finances...' : '👫 Generate Joint Plan'}
          </button>
        </form>
      )}

      {(loading || stepTrace.length > 0) && !result && (
        <AgentPipeline steps={stepTrace} loading={loading} />
      )}

      {result && plan && (
        <div className="space-y-5 animate-fade-in">
          <button onClick={reset} className="btn-secondary text-sm">← Recalculate</button>

          <div className="glass-card rounded-2xl p-5">
            <p className="text-sm leading-relaxed">{result.summary}</p>
          </div>

          <ImpactDashboard metrics={result.impactDashboard} riskFlags={result.riskFlags} adjustments={result.adjustments} auditSummary={result.auditSummary} />

          {plan.sipPlan && plan.sipPlan.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display font-semibold mb-3">SIP Strategy</h3>
              {plan.sipPlan.map((s, i) => (
                <div key={i} className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium text-sm">{s.instrument}</div>
                    <div className="text-xs text-muted-foreground">{s.category} · {s.rationale}</div>
                  </div>
                  <div className="font-mono font-bold text-primary text-sm">{formatCurrency(s.amount)}/mo</div>
                </div>
              ))}
            </div>
          )}

          {plan.taxSuggestions && plan.taxSuggestions.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display font-semibold mb-3">Joint Tax Strategy</h3>
              <ul className="space-y-2">
                {plan.taxSuggestions.map((t, i) => <li key={i} className="text-sm flex gap-2"><span className="text-primary">•</span>{t}</li>)}
              </ul>
            </div>
          )}

          {plan.actionItems && plan.actionItems.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display font-semibold mb-3">Action Items</h3>
              {plan.actionItems.map((a, i) => (
                <div key={i} className="flex items-start gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium
                    ${a.priority === 'high' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>{a.priority}</span>
                  <div><div className="text-sm">{a.action}</div><div className="text-xs text-muted-foreground">{a.timeline}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
