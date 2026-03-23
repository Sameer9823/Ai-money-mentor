'use client'
import { useState, useCallback } from 'react'
import { IndianRupee, Upload, CheckCircle2 } from 'lucide-react'
import { useAgent } from '@/hooks/useAgent'
import AgentPipeline from '@/components/ui/AgentPipeline'
import ImpactDashboard from '@/components/ui/ImpactDashboard'
import { formatINR } from '@/tools/financialTools'
import { useDropzone } from 'react-dropzone'

export default function TaxWizardPage() {
  const { loading, result, error, stepTrace, run, reset } = useAgent()
  const [form, setForm] = useState({
    basicSalary: 600000, hra: 240000, specialAllowance: 360000, otherIncome: 0,
    rentPaid: 20000, cityType: 'metro',
    section80C: 100000, section80D: 25000, npsContribution: 0,
    homeLoanInterest: 0, otherDeductions: 0,
  })
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) setPdfFile(files[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    let payload: Record<string, unknown> = { ...form }
    if (pdfFile) {
      const buf = await pdfFile.arrayBuffer()
      payload.pdfBuffer = Buffer.from(buf).toString('base64')
    }
    const data = await run('tax_wizard', payload)
    if (data) {
      const grossIncome = form.basicSalary + form.hra + form.specialAllowance + form.otherIncome
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          income: { monthly: Math.round(grossIncome / 12), annual: grossIncome },
          tax:    { section80C: form.section80C },
          personal: { city: form.cityType },
        }),
      }).catch(() => {})
      await fetch('/api/profile/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxSaved: data.impactDashboard?.taxSaved ?? 0 }),
      }).catch(() => {})
    }
  }

  const taxResult = result?.analysis?.taxResult
  const plan = result?.plan

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
          <IndianRupee className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Tax Wizard</h1>
          <p className="text-muted-foreground text-sm">Old vs New regime · PDF parsing · Deterministic tax engine</p>
        </div>
      </div>

      {!result && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* PDF Upload */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display font-semibold mb-3">Upload Form 16 (optional)</h3>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              {pdfFile ? (
                <div className="flex items-center justify-center gap-2 text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">{pdfFile.name}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Drop Form 16 PDF here or click to select</p>
              )}
            </div>
          </div>

          {/* Income */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-semibold">Annual Income</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Basic Salary (₹)', key: 'basicSalary' },
                { label: 'HRA (₹)', key: 'hra' },
                { label: 'Special Allowance (₹)', key: 'specialAllowance' },
                { label: 'Other Income (₹)', key: 'otherIncome' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-sm font-medium block mb-1">{label}</label>
                  <input type="number" value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} className="input-field" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Monthly Rent Paid (₹)</label>
                <input type="number" value={form.rentPaid}
                  onChange={e => setForm(f => ({ ...f, rentPaid: Number(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">City</label>
                <select value={form.cityType} onChange={e => setForm(f => ({ ...f, cityType: e.target.value }))} className="input-field">
                  <option value="metro">Metro</option>
                  <option value="non-metro">Non-Metro</option>
                </select>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-semibold">Deductions</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: '80C (max ₹1.5L)', key: 'section80C' },
                { label: '80D Health Insurance', key: 'section80D' },
                { label: 'NPS 80CCD(1B) (max ₹50k)', key: 'npsContribution' },
                { label: 'Home Loan Interest 24(b)', key: 'homeLoanInterest' },
                { label: 'Other Deductions', key: 'otherDeductions' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-sm font-medium block mb-1">{label} (₹)</label>
                  <input type="number" value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} className="input-field" />
                </div>
              ))}
            </div>
          </div>

          {error && <div className="text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
            {loading ? 'Tax Agents Running...' : '⚡ Analyze Tax & Compare Regimes'}
          </button>
        </form>
      )}

      {(loading || stepTrace.length > 0) && !result && (
        <AgentPipeline steps={stepTrace} loading={loading} />
      )}

      {result && taxResult && (
        <div className="space-y-5 animate-fade-in">
          <button onClick={reset} className="btn-secondary text-sm">← Recalculate</button>

          {/* Recommendation */}
          <div className={`rounded-2xl p-5 border-2 ${taxResult.recommendation === 'old' ? 'border-emerald-500 bg-emerald-500/5' : 'border-blue-500 bg-blue-500/5'}`}>
            <div className="flex items-center gap-3 mb-1">
              <CheckCircle2 className={`w-5 h-5 ${taxResult.recommendation === 'old' ? 'text-emerald-500' : 'text-blue-500'}`} />
              <span className="font-display font-bold">
                {taxResult.recommendation === 'old' ? 'Old' : 'New'} Regime saves you {formatINR(taxResult.savings)}
              </span>
            </div>
            {taxResult.hraExemption > 0 && (
              <p className="text-sm text-muted-foreground">HRA Exemption claimed: {formatINR(taxResult.hraExemption)}</p>
            )}
          </div>

          {/* Side by side */}
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { label: 'Old Regime', data: taxResult.oldRegime, active: taxResult.recommendation === 'old' },
              { label: 'New Regime', data: taxResult.newRegime, active: taxResult.recommendation === 'new' },
            ].map(({ label, data, active }) => (
              <div key={label} className={`glass-card rounded-2xl p-5 ${active ? 'ring-2 ring-primary' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display font-semibold">{label}</span>
                  {active && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Recommended</span>}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxable Income</span>
                    <span>{formatINR(data.taxableIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Tax (incl. cess)</span>
                    <span className="font-bold text-lg">{formatINR(data.tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Effective Rate</span>
                    <span>{data.effectiveRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <ImpactDashboard
            metrics={result.impactDashboard}
            riskFlags={result.riskFlags}
            adjustments={result.adjustments}
            auditSummary={result.auditSummary}
          />

          {/* AI suggestions */}
          {plan?.taxSuggestions && plan.taxSuggestions.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display font-semibold mb-3">💡 AI Tax Suggestions</h3>
              <ul className="space-y-2">
                {plan.taxSuggestions.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2"><span className="text-primary">•</span>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Missed deductions */}
          {plan?.missedDeductions && plan.missedDeductions.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display font-semibold mb-3">📋 Missed Deductions</h3>
              <div className="space-y-2">
                {plan.missedDeductions.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
                    <div>
                      <div className="font-medium text-sm">{d.section}</div>
                      <div className="text-xs text-muted-foreground">{d.description} (max ₹{(d.limit/100000).toFixed(1)}L)</div>
                    </div>
                    <div className="text-emerald-500 font-bold text-sm">Save {formatINR(d.saving)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan?.explainability && (
            <div className="glass-card rounded-2xl p-4 border border-primary/20">
              <div className="text-xs font-semibold text-primary mb-1">Why this recommendation?</div>
              <p className="text-xs text-muted-foreground">{plan.explainability}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}