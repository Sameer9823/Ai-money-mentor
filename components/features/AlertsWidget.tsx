'use client'
import { useState, useEffect } from 'react'
import { Bell, X, AlertTriangle, Info, CheckCircle2, Loader2 } from 'lucide-react'

interface Alert {
  _id: string
  message: string
  severity: 'critical' | 'warning' | 'info' | 'success'
  category: string
  read: boolean
  createdAt: string
}

const severityStyles = {
  critical: { bg: 'bg-rose-500/10 border-rose-500/30', icon: <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />, dot: 'bg-rose-500' },
  warning:  { bg: 'bg-amber-500/10 border-amber-500/30', icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />, dot: 'bg-amber-500' },
  info:     { bg: 'bg-blue-500/10 border-blue-500/30', icon: <Info className="w-4 h-4 text-blue-500 shrink-0" />, dot: 'bg-blue-500' },
  success:  { bg: 'bg-emerald-500/10 border-emerald-500/30', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />, dot: 'bg-emerald-500' },
}

export default function AlertsWidget({ compact = false }: { compact?: boolean }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then(d => setAlerts(d.alerts ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function dismiss(id: string) {
    setAlerts(prev => prev.filter(a => a._id !== id))
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId: id, action: 'dismiss' }),
    })
  }

  const unread = alerts.filter(a => !a.read)

  if (loading) return compact ? null : (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading alerts...
    </div>
  )

  if (alerts.length === 0) return null

  if (compact) {
    return (
      <div className="relative">
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
            {unread.length}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.slice(0, 5).map(alert => {
        const style = severityStyles[alert.severity]
        return (
          <div key={alert._id} className={`flex items-start gap-3 p-3 rounded-xl border ${style.bg} relative`}>
            {style.icon}
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed">{alert.message}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {new Date(alert.createdAt).toLocaleDateString('en-IN')}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground capitalize">{alert.category}</span>
              </div>
            </div>
            <button onClick={() => dismiss(alert._id)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}