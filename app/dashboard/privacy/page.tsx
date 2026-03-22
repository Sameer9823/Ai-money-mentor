'use client'
import { useState } from 'react'
import { Shield, Download, Trash2, Eye, FileJson, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'
import ConfirmModal from '@/components/dashboard/ConfirmModal'

export default function PrivacyPage() {
  const [deleteModal, setDeleteModal] = useState(false)
  const [exportModal, setExportModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function downloadExport(format: 'json' | 'csv') {
    window.open(`/api/export?format=${format}`, '_blank')
    showToast(`Downloading ${format.toUpperCase()} export...`)
  }

  async function deleteAllData() {
    const res = await fetch('/api/profile', { method: 'DELETE' })
    if (res.ok) {
      showToast('All data deleted. Redirecting...')
      setTimeout(() => window.location.href = '/login', 2000)
    }
    setDeleteModal(false)
  }

  const dataCategories = [
    { icon: '👤', label: 'Account Info', desc: 'Name, email, auth provider', stored: true },
    { icon: '💰', label: 'Financial Profile', desc: 'Income, expenses, investments, insurance', stored: true },
    { icon: '🎯', label: 'Goals', desc: 'Financial goals and progress', stored: true },
    { icon: '📊', label: 'Reports', desc: 'AI-generated analysis reports', stored: true },
    { icon: '📅', label: 'Timeline', desc: 'Financial decision history', stored: true },
    { icon: '🤖', label: 'Agent Logs', desc: 'Step-by-step AI decision trail', stored: true },
    { icon: '🏆', label: 'Gamification', desc: 'Badges, streaks, points', stored: true },
    { icon: '🔔', label: 'Alerts', desc: 'Smart financial alerts', stored: true },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-emerald-500 text-white text-sm font-medium shadow-lg animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Privacy & Data</h1>
          <p className="text-muted-foreground text-sm">Manage your stored data and privacy settings</p>
        </div>
      </div>

      {/* Data stored */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-primary" />
          <h2 className="font-display font-semibold">What We Store</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {dataCategories.map(cat => (
            <div key={cat.label} className="flex items-start gap-3 p-3 bg-secondary rounded-xl">
              <span className="text-lg shrink-0">{cat.icon}</span>
              <div>
                <div className="font-medium text-sm">{cat.label}</div>
                <div className="text-xs text-muted-foreground">{cat.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            <strong>Your data stays private.</strong> We never sell your data or share it with third parties.
            All financial analysis is done securely using Anthropic's Claude API.
          </p>
        </div>
      </div>

      {/* Export */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-4 h-4 text-primary" />
          <h2 className="font-display font-semibold">Export Your Data</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Download a complete copy of all your stored financial data. This includes your profile,
          goals, reports, timeline, and AI analysis results.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => downloadExport('json')}
            className="flex items-center gap-2 btn-secondary text-sm py-2.5 px-4"
          >
            <FileJson className="w-4 h-4 text-blue-500" />
            Export as JSON
          </button>
          <button
            onClick={() => downloadExport('csv')}
            className="flex items-center gap-2 btn-secondary text-sm py-2.5 px-4"
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            Export as CSV
          </button>
        </div>
      </div>

      {/* GDPR rights */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-blue-500" />
          <h2 className="font-display font-semibold">Your Rights</h2>
        </div>
        <div className="space-y-3">
          {[
            { right: 'Right to Access', desc: 'Download all your data using the export feature above' },
            { right: 'Right to Portability', desc: 'Export in JSON or CSV format for use elsewhere' },
            { right: 'Right to Erasure', desc: 'Permanently delete all your data at any time' },
            { right: 'Right to Correction', desc: 'Edit your profile and financial data from the dashboard' },
          ].map(({ right, desc }) => (
            <div key={right} className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-sm">{right}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="glass-card rounded-2xl p-6 border border-destructive/20">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <h2 className="font-display font-semibold text-destructive">Danger Zone</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This action is irreversible.
          All financial profiles, goals, reports, and agent logs will be permanently erased.
        </p>
        <button
          onClick={() => setDeleteModal(true)}
          className="flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/30 text-sm py-2.5 px-4 rounded-xl font-semibold hover:bg-destructive/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete All My Data
        </button>
      </div>

      <ConfirmModal
        open={deleteModal}
        title="Delete All Data"
        message="This will permanently delete your account, financial profile, all reports, goals, and AI analysis data. This action cannot be undone and is GDPR compliant."
        confirmLabel="Delete Everything Permanently"
        onConfirm={deleteAllData}
        onCancel={() => setDeleteModal(false)}
      />
    </div>
  )
}