'use client'
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useAgent } from '@/hooks/useAgent'
import AgentPipeline from '@/components/ui/AgentPipeline'
import ImpactDashboard from '@/components/ui/ImpactDashboard'
import ScoreRing from '@/components/charts/ScoreRingDynamic'

export default function MoneyHealthPage() {
  const { loading, result, error, stepTrace, run, reset } = useAgent()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    monthlyIncome: 80000, monthlyExpenses: 45000, savings: 150000, age: 28,
    hasEmergencyFund: true, emergencyFundMonths: 3,
    hasTermInsurance: false, hasHealthInsurance: true, healthCoverAmount: 500000,
    totalDebt: 200000, monthlyEMI: 8000,
    investmentAmount: 15000, investmentTypes: 'Mutual Funds, SIP',
    hasPPF: false, hasNPS: false, section80CInvested: 50000,
    hasRetirementPlan: false,
  })

  function update(key: string, val: unknown) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit() {
    const data = await run('money_health', {
      ...form,
      investmentTypes: form.investmentTypes.split(',').map(s => s.trim()),
    })

    if (data) {
      // Calculate score from dimensions
      const emergencyScore = form.emergencyFundMonths >= 6 ? 20 : form.emergencyFundMonths >= 3 ? 12 : 4
      const insuranceScore = (form.hasTermInsurance ? 10 : 0) + (form.hasHealthInsurance ? 10 : 0)
      const investScore    = Math.min(20, Math.round((form.investmentAmount / Math.max(1, form.monthlyIncome)) * 60))
      const debtScore      = form.monthlyEMI / Math.max(1, form.monthlyIncome) < 0.2 ? 15 : form.monthlyEMI / Math.max(1, form.monthlyIncome) < 0.4 ? 8 : 3
      const taxScore       = Math.min(10, Math.round((form.section80CInvested / 150000) * 10))
      const retireScore    = form.hasRetirementPlan ? 15 : form.hasNPS ? 8 : 3
      const score          = emergencyScore + insuranceScore + investScore + debtScore + taxScore + retireScore
      const retirementReadiness = data.impactDashboard?.retirementReadiness ?? 0
      const taxSaved            = data.impactDashboard?.taxSaved ?? 0

      // Save to profile latestAnalysis so dashboard updates
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Also update the profile financial data
          income:      { monthly: form.monthlyIncome },
          expenses:    { monthly: form.monthlyExpenses, emi: form.monthlyEMI },
          savings:     { total: form.savings, emergencyMonths: form.emergencyFundMonths },
          investments: { total: form.investmentAmount * 12 },
          insurance:   { hasTermInsurance: form.hasTermInsurance, hasHealthInsurance: form.hasHealthInsurance, healthCover: form.healthCoverAmount },
          liabilities: { totalDebt: form.totalDebt },
          personal:    { age: form.age },
          tax:         { section80C: form.section80CInvested },
        }),
      }).catch(() => {})

      // Save latestAnalysis separately
      await fetch('/api/profile/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ healthScore: score, retirementReadiness, taxSaved }),
      }).catch(() => {})
    }
  }

  const plan = result?.plan
  const dims = plan ? {
    'Emergency Fund': { score: form.emergencyFundMonths >= 6 ? 20 : form.emergencyFundMonths >= 3 ? 12 : 4, max: 20 },
    'Insurance': { score: (form.hasTermInsurance ? 10 : 0) + (form.hasHealthInsurance ? 10 : 0), max: 20 },
    'Investments': { score: Math.min(20, Math.round((form.investmentAmount / Math.max(1, form.monthlyIncome)) * 60)), max: 20 },
    'Debt Health': { score: form.monthlyEMI / Math.max(1, form.monthlyIncome) < 0.2 ? 15 : form.monthlyEMI / Math.max(1, form.monthlyIncome) < 0.4 ? 8 : 3, max: 15 },
    'Tax Efficiency': { score: Math.min(10, Math.round((form.section80CInvested / 150000) * 10)), max: 10 },
    'Retirement': { score: form.hasRetirementPlan ? 15 : form.hasNPS ? 8 : 3, max: 15 },
  } : null
  const totalScore = dims ? Object.values(dims).reduce((s, d) => s + d.score, 0) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
          <Heart className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Money Health Score</h1>
          <p className="text-muted-foreground text-sm">6-dimension AI analysis · Autonomous agent evaluation</p>
        </div>
      </div>

      {/* Multi-step form */}
      {!result && (
        <>
          {step < 4 && (
            <div className="flex gap-1.5 items-center">
              {[1,2,3].map(s => (
                <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-secondary'}`} />
              ))}
              <span className="text-xs text-muted-foreground ml-2">Step {step}/3</span>
            </div>
          )}

          {step === 1 && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h2 className="font-display font-semibold">Income & Emergency Fund</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Monthly Income (₹)', key: 'monthlyIncome' },
                  { label: 'Monthly Expenses (₹)', key: 'monthlyExpenses' },
                  { label: 'Total Savings (₹)', key: 'savings' },
                  { label: 'Age', key: 'age' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-sm font-medium block mb-1">{label}</label>
                    <input type="number" value={form[key as keyof typeof form] as number}
                      onChange={e => update(key, Number(e.target.value))} className="input-field" />
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.hasEmergencyFund}
                  onChange={e => update('hasEmergencyFund', e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                <span className="text-sm">I have an emergency fund</span>
              </label>
              {form.hasEmergencyFund && (
                <div>
                  <label className="text-sm font-medium block mb-1">Covers (months)</label>
                  <input type="number" value={form.emergencyFundMonths}
                    onChange={e => update('emergencyFundMonths', Number(e.target.value))} className="input-field" />
                </div>
              )}
              <button onClick={() => setStep(2)} className="btn-primary">Next →</button>
            </div>
          )}

          {step === 2 && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h2 className="font-display font-semibold">Insurance & Debt</h2>
              {[
                { label: 'Term Life Insurance', key: 'hasTermInsurance' },
                { label: 'Health Insurance', key: 'hasHealthInsurance' },
              ].map(({ label, key }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                    onChange={e => update(key, e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
              {form.hasHealthInsurance && (
                <div>
                  <label className="text-sm font-medium block mb-1">Health Cover (₹)</label>
                  <input type="number" value={form.healthCoverAmount}
                    onChange={e => update('healthCoverAmount', Number(e.target.value))} className="input-field" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Total Debt (₹)</label>
                  <input type="number" value={form.totalDebt}
                    onChange={e => update('totalDebt', Number(e.target.value))} className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Monthly EMI (₹)</label>
                  <input type="number" value={form.monthlyEMI}
                    onChange={e => update('monthlyEMI', Number(e.target.value))} className="input-field" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary">← Back</button>
                <button onClick={() => setStep(3)} className="btn-primary">Next →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h2 className="font-display font-semibold">Investments & Tax</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Monthly Investments (₹)</label>
                  <input type="number" value={form.investmentAmount}
                    onChange={e => update('investmentAmount', Number(e.target.value))} className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">80C Invested (₹)</label>
                  <input type="number" value={form.section80CInvested}
                    onChange={e => update('section80CInvested', Number(e.target.value))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Investment Types</label>
                <input value={form.investmentTypes}
                  onChange={e => update('investmentTypes', e.target.value)}
                  placeholder="Mutual Funds, SIP, FD, Stocks" className="input-field" />
              </div>
              {[
                { label: 'PPF account', key: 'hasPPF' },
                { label: 'NPS account', key: 'hasNPS' },
                { label: 'Retirement plan', key: 'hasRetirementPlan' },
              ].map(({ label, key }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                    onChange={e => update(key, e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
              {error && <div className="text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary">← Back</button>
                <button onClick={handleSubmit} disabled={loading} className="btn-primary disabled:opacity-50">
                  {loading ? 'Agents running...' : '🤖 Calculate Health Score'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {(loading || stepTrace.length > 0) && !result && (
        <AgentPipeline steps={stepTrace} loading={loading} />
      )}

      {result && (
        <div className="space-y-5 animate-fade-in">
          <button onClick={() => { reset(); setStep(1) }} className="btn-secondary text-sm">← Recalculate</button>

          {/* Score ring */}
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <ScoreRing score={totalScore} size={120} strokeWidth={8} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div>
                    <div className="font-display text-4xl font-bold">{totalScore}</div>
                    <div className="text-xs text-muted-foreground">/100</div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">{result.summary}</p>
          </div>

          {/* Dimensions */}
          {dims && (
            <div className="grid md:grid-cols-2 gap-3">
              {Object.entries(dims).map(([name, { score, max }]) => (
                <div key={name} className="glass-card rounded-xl p-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-sm">{name}</span>
                    <span className="font-bold text-sm text-primary">{score}/{max}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${(score / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <ImpactDashboard
            metrics={result.impactDashboard}
            riskFlags={result.riskFlags}
            adjustments={result.adjustments}
            auditSummary={result.auditSummary}
          />

          {plan?.actionItems && plan.actionItems.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display font-semibold mb-3">Top Actions</h3>
              {plan.actionItems.slice(0, 4).map((a, i) => (
                <div key={i} className="flex items-start gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium
                    ${a.priority === 'high' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {a.priority}
                  </span>
                  <span className="text-sm">{a.action}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}