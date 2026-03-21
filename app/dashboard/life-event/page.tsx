'use client'
import { useState } from 'react'
import { Zap } from 'lucide-react'
import { useAgent } from '@/hooks/useAgent'
import AgentPipeline from '@/components/ui/AgentPipeline'
import ImpactDashboard from '@/components/ui/ImpactDashboard'
import { formatCurrency } from '@/tools/financialTools'

const events = [
  { id: 'bonus', label: '💰 Bonus', desc: 'Performance bonus or incentive' },
  { id: 'marriage', label: '💍 Marriage', desc: 'Getting married' },
  { id: 'child', label: '👶 New Child', desc: 'Baby on the way' },
  { id: 'inheritance', label: '🏦 Inheritance', desc: 'Received inheritance or gift' },
  { id: 'job_change', label: '💼 Job Change', desc: 'New job or salary hike' },
  { id: 'home_purchase', label: '🏠 Home Purchase', desc: 'Planning to buy a house' },
]

export default function LifeEventPage() {
  const { loading, result, error, stepTrace, run, reset } = useAgent()
  const [form, setForm] = useState({
    event: '', amount: 500000, currentAge: 28,
    monthlyIncome: 80000, existingInvestments: 500000,
    riskProfile: 'moderate', additionalContext: '',
  })

  async function handleSubmit() {
    if (!form.event) return
    await run('life_event', form)
  }

  const plan = result?.plan

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
          <Zap className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Life Event Advisor</h1>
          <p className="text-muted-foreground text-sm">Multi-step agent reasoning for every life moment</p>
        </div>
      </div>

      {!result && (
        <div className="space-y-5">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display font-semibold mb-4">What's happening?</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {events.map(ev => (
                <button key={ev.id} onClick={() => setForm(f => ({ ...f, event: ev.id }))}
                  className={`p-4 rounded-xl border text-left transition-all ${form.event === ev.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                  <div className="font-semibold text-sm">{ev.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{ev.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {form.event && (
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <h3 className="font-display font-semibold">Your Details</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Amount Involved (₹)', key: 'amount' },
                  { label: 'Current Age', key: 'currentAge' },
                  { label: 'Monthly Income (₹)', key: 'monthlyIncome' },
                  { label: 'Existing Investments (₹)', key: 'existingInvestments' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-sm font-medium block mb-1">{label}</label>
                    <input type="number" value={form[key as keyof typeof form] as number}
                      onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} className="input-field" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Risk Profile</label>
                <div className="flex gap-3">
                  {(['conservative', 'moderate', 'aggressive'] as const).map(r => (
                    <button key={r} type="button" onClick={() => setForm(f => ({ ...f, riskProfile: r }))}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium capitalize transition-all ${form.riskProfile === r ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Additional context (optional)</label>
                <textarea value={form.additionalContext} onChange={e => setForm(f => ({ ...f, additionalContext: e.target.value }))}
                  placeholder="e.g. I have a home loan, planning to relocate..." className="input-field resize-none h-20" />
              </div>
              {error && <div className="text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
              <button onClick={handleSubmit} disabled={loading} className="btn-primary disabled:opacity-50">
                {loading ? 'Agents Generating Strategy...' : '⚡ Get Financial Strategy'}
              </button>
            </div>
          )}
        </div>
      )}

      {(loading || stepTrace.length > 0) && !result && (
        <AgentPipeline steps={stepTrace} loading={loading} />
      )}

      {result && plan && (
        <div className="space-y-5 animate-fade-in">
          <button onClick={reset} className="btn-secondary text-sm">← New Event</button>

          <div className="glass-card rounded-2xl p-5">
            <p className="text-sm leading-relaxed">{result.summary}</p>
          </div>

          <ImpactDashboard metrics={result.impactDashboard} riskFlags={result.riskFlags} adjustments={result.adjustments} auditSummary={result.auditSummary} />

          {plan.actionItems && (
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

          {plan.sipPlan && plan.sipPlan.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display font-semibold mb-3">Investment Strategy</h3>
              {plan.sipPlan.map((s, i) => (
                <div key={i} className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-xs">{s.category.slice(0,3)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{s.instrument}</div>
                    <div className="text-xs text-muted-foreground">{s.rationale}</div>
                  </div>
                  <div className="font-mono font-bold text-primary text-sm">{formatCurrency(s.amount)}</div>
                </div>
              ))}
            </div>
          )}

          {plan.taxSuggestions && plan.taxSuggestions.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display font-semibold mb-2">Tax Strategy</h3>
              <ul className="space-y-1">{plan.taxSuggestions.map((t, i) => <li key={i} className="text-sm flex gap-2"><span className="text-primary">•</span>{t}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
