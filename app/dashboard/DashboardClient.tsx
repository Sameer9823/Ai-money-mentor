'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp, Heart, IndianRupee, BarChart3, Target,
  Plus, Trash2, Download, FileText, RefreshCw,
  Wallet, ArrowUpRight, ArrowDownRight, CheckCircle2,
  AlertTriangle, Zap, Users
} from 'lucide-react'
import EditableCard from '@/components/dashboard/EditableCard'
import ConfirmModal from '@/components/dashboard/ConfirmModal'
import ScoreRingDynamic from '@/components/charts/ScoreRingDynamic'
import { formatCurrency } from '@/tools/financialTools'
import dynamic from 'next/dynamic'

const NextBestAction   = dynamic(() => import('@/components/features/NextBestAction'),   { ssr: false })
const SmartQuestion    = dynamic(() => import('@/components/features/SmartQuestion'),    { ssr: false })
const AlertsWidget     = dynamic(() => import('@/components/features/AlertsWidget'),     { ssr: false })
const GamificationWidget = dynamic(() => import('@/components/features/GamificationWidget'), { ssr: false })

interface ProfileSection {
  monthly?: number
  annual?: number
  other?: number
  rent?: number
  emi?: number
  total?: number
  emergencyFund?: number
  emergencyMonths?: number
  equity?: number
  debt?: number
  gold?: number
  mutualFunds?: number
  hasTermInsurance?: boolean
  hasHealthInsurance?: boolean
  healthCover?: number
  totalDebt?: number
  age?: number
  city?: string
  riskProfile?: string
  retirementAge?: number
}

interface Profile {
  version: number
  income: ProfileSection
  expenses: ProfileSection
  savings: ProfileSection
  investments: ProfileSection
  insurance: ProfileSection
  liabilities: ProfileSection
  personal: ProfileSection
  latestAnalysis?: {
    healthScore: number
    retirementReadiness: number
    taxSaved: number
    netWorth: number
  }
}

interface Goal {
  _id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  category: string
  priority: string
  progress: number
  monthlySIPRequired: number
  completed: boolean
}

interface Report {
  reportId: string
  type: string
  title: string
  createdAt: string
  profileVersion: number
  metrics: { healthScore?: number; taxSaved?: number; xirr?: number }
}

const CAT_ICONS: Record<string, string> = {
  retirement: '🏖', house: '🏠', education: '🎓',
  emergency: '🛡', travel: '✈️', vehicle: '🚗', other: '🎯',
}

export default function DashboardClient() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [rerunning, setRerunning] = useState(false)
  const [editProfile, setEditProfile] = useState<Partial<Profile> | null>(null)
  const [addingGoal, setAddingGoal] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [newGoal, setNewGoal] = useState({
    name: '', targetAmount: 500000, currentAmount: 0,
    targetDate: '', category: 'other', priority: 'medium',
  })
  const [deleteModal, setDeleteModal] = useState<{ type: 'goal' | 'report' | 'account'; id?: string } | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function load() {
      try {
        const [pR, gR, rR] = await Promise.all([
          fetch('/api/profile'), fetch('/api/goals'), fetch('/api/reports'),
        ])
        if (pR.ok) { const d = await pR.json(); setProfile(d.profile) }
        if (gR.ok) { const d = await gR.json(); setGoals(d.goals ?? []) }
        if (rR.ok) { const d = await rR.json(); setReports(d.reports ?? []) }
      } finally { setLoading(false) }
    }
    load()

    // Re-fetch profile when user returns to this tab (e.g. after calculating on another page)
    function onFocus() {
      fetch('/api/profile')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.profile) setProfile(d.profile) })
        .catch(() => {})
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  async function saveProfile() {
    if (!editProfile) return
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editProfile),
    })
    if (res.ok) {
      const d = await res.json()
      setProfile(d.profile)
      setEditProfile(null)
      showToast('Profile updated successfully')
    } else {
      showToast('Failed to update profile', 'error')
    }
  }

  async function triggerRerun() {
    if (!profile) return
    setRerunning(true)
    try {
      // Only send triggerRerun flag — don't re-send entire profile which causes schema conflicts
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerRerun: true }),
      })
      if (res.ok) {
        const d = await res.json()
        if (d.profile) setProfile(d.profile)
        showToast('Analysis updated!')
      } else {
        const err = await res.json().catch(() => ({}))
        showToast('Re-run failed: ' + (err.error ?? 'Server error'), 'error')
      }
    } catch {
      showToast('Re-run failed', 'error')
    } finally {
      setRerunning(false)
    }
  }

  async function addGoal() {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGoal),
    })
    if (res.ok) {
      const d = await res.json()
      setGoals(prev => [d.goal, ...prev])
      setAddingGoal(false)
      setNewGoal({ name: '', targetAmount: 500000, currentAmount: 0, targetDate: '', category: 'other', priority: 'medium' })
      showToast('Goal added!')
    }
  }

  async function deleteGoal(id: string) {
    const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    if (res.ok) { setGoals(prev => prev.filter(g => g._id !== id)); showToast('Goal deleted') }
    setDeleteModal(null)
  }

  async function deleteReport(id: string) {
    const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
    if (res.ok) { setReports(prev => prev.filter(r => r.reportId !== id)); showToast('Report deleted') }
    setDeleteModal(null)
  }

  async function downloadPDF(reportId: string) {
    setDownloading(reportId)
    try {
      const res = await fetch(`/api/reports/pdf?reportId=${reportId}`)
      const contentType = res.headers.get('content-type') ?? ''

      // If response is HTML, it's a Next.js error page — extract useful info
      if (contentType.includes('text/html')) {
        showToast('Server error generating report. Check terminal logs.', 'error')
        return
      }

      const json = await res.json().catch(() => null)
      if (!res.ok || !json) {
        showToast(json?.error ?? 'Failed to fetch report', 'error')
        return
      }

      const reportData = json.reportData
      const uName = json.userName ?? 'User'

      if (!reportData) {
        showToast('Report data is empty', 'error')
        return
      }

      const { generateAndDownloadPDF } = await import('@/lib/generatePDF')
      await generateAndDownloadPDF(reportData, uName)
      showToast('PDF downloaded!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('PDF download error:', msg)
      showToast(`Download failed: ${msg.slice(0, 100)}`, 'error')
    } finally {
      setDownloading(null)
    }
  }

  async function deleteAccount() {
    const res = await fetch('/api/profile', { method: 'DELETE' })
    if (res.ok) window.location.href = '/login'
    setDeleteModal(null)
  }

  function getVal(section: string, key: string): number {
    const src = editProfile ?? profile
    if (!src) return 0
    const sec = src[section as keyof Profile] as ProfileSection | undefined
    return (sec?.[key as keyof ProfileSection] as number) ?? 0
  }

  function setVal(section: string, key: string, value: number) {
    const cur = editProfile ?? { ...(profile ?? {}) }
    const sec = { ...((cur[section as keyof Profile] as ProfileSection) ?? {}) }
    ;(sec as Record<string, unknown>)[key] = value
    setEditProfile({ ...cur, [section]: sec } as Partial<Profile>)
  }

  const netWorth = profile
    ? (profile.investments?.total ?? 0) + (profile.savings?.total ?? 0) - (profile.liabilities?.totalDebt ?? 0)
    : 0
  const surplus = profile ? (profile.income?.monthly ?? 0) - (profile.expenses?.monthly ?? 0) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground animate-pulse">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in flex items-center gap-2
          ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-destructive text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Financial Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Profile v{profile?.version ?? 1}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={triggerRerun} disabled={rerunning || !profile}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${rerunning ? 'animate-spin' : ''}`} />
            {rerunning ? 'Running agents...' : 'Re-analyze'}
          </button>
          <button onClick={() => setDeleteModal({ type: 'account' })}
            className="text-xs text-destructive hover:text-destructive/80 px-3 py-2 rounded-lg hover:bg-destructive/10 transition-colors">
            Delete Account
          </button>
        </div>
      </div>

      {/* Smart Question */}
      <SmartQuestion />

      {/* Alerts */}
      <AlertsWidget />

      {/* Next Best Action */}
      <NextBestAction />

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Net Worth', value: formatCurrency(netWorth), icon: Wallet, color: netWorth >= 0 ? 'text-emerald-500' : 'text-rose-500', bg: 'bg-emerald-500/10' },
          { label: 'Monthly Surplus', value: formatCurrency(surplus), icon: surplus >= 0 ? ArrowUpRight : ArrowDownRight, color: surplus >= 0 ? 'text-emerald-500' : 'text-rose-500', bg: 'bg-blue-500/10' },
          { label: 'Total Investments', value: formatCurrency(profile?.investments?.total ?? 0), icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Total Debt', value: formatCurrency(profile?.liabilities?.totalDebt ?? 0), icon: ArrowDownRight, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`font-display text-xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Top row */}
      <div className="grid md:grid-cols-3 gap-5">
        <EditableCard title="Money Health Score" icon={<Heart className="w-4 h-4 text-rose-500" />}>
          {profile?.latestAnalysis?.healthScore ? (
            <div className="flex items-center gap-4">
              <div className="relative w-[72px] h-[72px] shrink-0">
                <ScoreRingDynamic score={profile.latestAnalysis.healthScore} size={72} strokeWidth={6} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display font-bold text-lg">{profile.latestAnalysis.healthScore}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Retirement readiness</div>
                <div className="font-bold text-emerald-500">{profile.latestAnalysis.retirementReadiness ?? 0}%</div>
                <Link href="/dashboard/money-health" className="text-xs text-primary mt-1 flex items-center gap-1">
                  Update <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <div className="text-muted-foreground text-sm mb-2">Not calculated yet</div>
              <Link href="/dashboard/money-health" className="btn-primary text-xs py-2 px-4 inline-flex">Calculate Now</Link>
            </div>
          )}
        </EditableCard>

        <EditableCard title="FIRE Plan" icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Retirement Age', value: `${profile?.personal?.retirementAge ?? 60} yrs` },
              { label: 'Current Age', value: `${profile?.personal?.age ?? 30} yrs` },
              { label: 'Risk Profile', value: profile?.personal?.riskProfile ?? 'moderate' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold capitalize">{value}</span>
              </div>
            ))}
            <Link href="/dashboard/fire-planner" className="text-xs text-primary flex items-center gap-1 pt-1">
              Run FIRE Planner <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </EditableCard>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-display font-semibold mb-3">Quick Actions</h3>
          <div className="space-y-1.5">
            {[
              { href: '/dashboard/tax-wizard', icon: IndianRupee, label: 'Tax Wizard', color: 'text-amber-500' },
              { href: '/dashboard/portfolio', icon: BarChart3, label: 'Portfolio X-Ray', color: 'text-cyan-500' },
              { href: '/dashboard/life-event', icon: Zap, label: 'Life Event Advisor', color: 'text-purple-500' },
              { href: '/dashboard/couples-planner', icon: Users, label: "Couple's Planner", color: 'text-blue-500' },
            ].map(({ href, icon: Icon, label, color }) => (
              <Link key={href} href={href} className="flex items-center gap-2 p-2 rounded-xl hover:bg-secondary transition-colors text-sm">
                <Icon className={`w-4 h-4 ${color}`} /> {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Overview editable */}
      <EditableCard
        title="Financial Overview"
        icon={<Wallet className="w-4 h-4 text-primary" />}
        badge={<span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">v{profile?.version ?? 1}</span>}
        editContent={
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Monthly Income (₹)', section: 'income', key: 'monthly' },
              { label: 'Monthly Expenses (₹)', section: 'expenses', key: 'monthly' },
              { label: 'Total Savings (₹)', section: 'savings', key: 'total' },
              { label: 'Emergency Fund Months', section: 'savings', key: 'emergencyMonths' },
              { label: 'Total Investments (₹)', section: 'investments', key: 'total' },
              { label: 'Total Debt (₹)', section: 'liabilities', key: 'totalDebt' },
              { label: 'Age', section: 'personal', key: 'age' },
              { label: 'Retirement Age', section: 'personal', key: 'retirementAge' },
            ].map(({ label, section, key }) => (
              <div key={`${section}.${key}`}>
                <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                <input
                  type="number"
                  value={getVal(section, key)}
                  onChange={e => setVal(section, key, Number(e.target.value))}
                  className="input-field text-sm py-2"
                />
              </div>
            ))}
          </div>
        }
        onSave={saveProfile}
        onCancel={() => setEditProfile(null)}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Monthly Income', value: formatCurrency(profile?.income?.monthly ?? 0) },
            { label: 'Monthly Expenses', value: formatCurrency(profile?.expenses?.monthly ?? 0) },
            { label: 'Total Savings', value: formatCurrency(profile?.savings?.total ?? 0) },
            { label: 'Investments', value: formatCurrency(profile?.investments?.total ?? 0) },
            { label: 'Total Debt', value: formatCurrency(profile?.liabilities?.totalDebt ?? 0) },
            { label: 'Emergency Fund', value: `${profile?.savings?.emergencyMonths ?? 0} months` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-secondary rounded-xl p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="font-semibold mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </EditableCard>

      {/* Goals */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-500" />
            <h3 className="font-display font-semibold">Goals Tracker</h3>
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{goals.length}</span>
          </div>
          <button onClick={() => setAddingGoal(true)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Goal
          </button>
        </div>

        {addingGoal && (
          <div className="mb-4 p-4 bg-secondary rounded-xl space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Goal Name</label>
                <input value={newGoal.name} onChange={e => setNewGoal(g => ({ ...g, name: e.target.value }))}
                  placeholder="e.g. Buy a house" className="input-field" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Target (₹)</label>
                <input type="number" value={newGoal.targetAmount}
                  onChange={e => setNewGoal(g => ({ ...g, targetAmount: Number(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Current (₹)</label>
                <input type="number" value={newGoal.currentAmount}
                  onChange={e => setNewGoal(g => ({ ...g, currentAmount: Number(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Target Date</label>
                <input type="date" value={newGoal.targetDate}
                  onChange={e => setNewGoal(g => ({ ...g, targetDate: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Category</label>
                <select value={newGoal.category}
                  onChange={e => setNewGoal(g => ({ ...g, category: e.target.value }))} className="input-field">
                  {Object.entries(CAT_ICONS).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addGoal} disabled={!newGoal.name || !newGoal.targetDate}
                className="btn-primary text-xs py-2 disabled:opacity-50">Add Goal</button>
              <button onClick={() => setAddingGoal(false)} className="btn-secondary text-xs py-2">Cancel</button>
            </div>
          </div>
        )}

        {goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No goals yet. Add your first financial goal!</div>
        ) : (
          <div className="space-y-3">
            {goals.map(goal => (
              <div key={goal._id} className="p-4 bg-secondary rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{CAT_ICONS[goal.category] ?? '🎯'}</span>
                      <span className="font-medium text-sm">{goal.name}</span>
                      {goal.completed && <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">✓ Done</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)} · SIP: {formatCurrency(goal.monthlySIPRequired)}/mo
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${goal.priority === 'high' ? 'bg-rose-500/10 text-rose-500'
                        : goal.priority === 'medium' ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {goal.priority}
                    </span>
                    <button onClick={() => setDeleteModal({ type: 'goal', id: goal._id })}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700
                    ${goal.completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary to-emerald-400'}`}
                    style={{ width: `${goal.progress}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">By {new Date(goal.targetDate).toLocaleDateString('en-IN')}</span>
                  <span className="text-xs font-semibold text-primary">{goal.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gamification */}
      <GamificationWidget />

      {/* Reports */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            <h3 className="font-display font-semibold">Past Reports</h3>
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{reports.length}</span>
          </div>
        </div>
        {reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No reports yet. Run any analysis to generate a report.</div>
        ) : (
          <div className="space-y-2">
            {reports.slice(0, 8).map(r => (
              <div key={r.reportId} className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                <div>
                  <div className="font-medium text-sm">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString('en-IN')} · v{r.profileVersion}
                    {r.metrics?.taxSaved ? ` · Saved ${formatCurrency(r.metrics.taxSaved)}` : ''}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => downloadPDF(r.reportId)} disabled={downloading === r.reportId}
                    className="w-8 h-8 rounded-lg hover:bg-background flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                    title="Download PDF">
                    {downloading === r.reportId
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setDeleteModal({ type: 'report', id: r.reportId })}
                    className="w-8 h-8 rounded-lg hover:bg-background flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal open={deleteModal?.type === 'goal'} title="Delete Goal"
        message="Delete this goal? This cannot be undone."
        onConfirm={() => deleteModal?.id && deleteGoal(deleteModal.id)}
        onCancel={() => setDeleteModal(null)} />
      <ConfirmModal open={deleteModal?.type === 'report'} title="Delete Report"
        message="Remove from your list? The audit trail is preserved for compliance." confirmLabel="Delete Report"
        onConfirm={() => deleteModal?.id && deleteReport(deleteModal.id)}
        onCancel={() => setDeleteModal(null)} />
      <ConfirmModal open={deleteModal?.type === 'account'} title="Delete Account & All Data"
        message="Permanently delete your account and all data. GDPR compliant. Cannot be undone." confirmLabel="Delete Everything"
        onConfirm={deleteAccount} onCancel={() => setDeleteModal(null)} />
    </div>
  )
}