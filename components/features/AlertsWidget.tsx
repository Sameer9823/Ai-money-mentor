'use client'
import { useState, useEffect } from 'react'
import { X, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'

interface Alert {
  _id: string
  message: string
  severity: 'critical' | 'warning' | 'info' | 'success'
  category: string
  read: boolean
  createdAt: string
}

const severityStyles = {
  critical: { bg: 'bg-rose-500/10 border-rose-500/20',   icon: <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />   },
  warning:  { bg: 'bg-amber-500/10 border-amber-500/20', icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> },
  info:     { bg: 'bg-blue-500/10 border-blue-500/20',   icon: <Info className="w-4 h-4 text-blue-500 shrink-0" />           },
  success:  { bg: 'bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> },
}

export default function AlertsWidget() {
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.ok ? r.json() : { alerts: [] })
      .then(d => setAlerts(d.alerts ?? []))
      .catch(() => {})
  }, [])

  if (alerts.length === 0) return null

  async function dismiss(id: string) {
    setAlerts(prev => prev.filter(a => a._id !== id))
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId: id, action: 'dismiss' }),
    }).catch(() => {})
  }

  return (
    <div className="space-y-2">
      {alerts.slice(0, 4).map(alert => {
        const style = severityStyles[alert.severity] ?? severityStyles.info
        return (
          <div key={alert._id} className={`flex items-start gap-3 p-3 rounded-xl border ${style.bg}`}>
            {style.icon}
            <p className="text-sm flex-1 leading-relaxed">{alert.message}</p>
            <button onClick={() => dismiss(alert._id)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}