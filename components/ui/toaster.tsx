'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

let toastQueue: Array<(toast: Toast) => void> = []

export function toast(message: string, type: Toast['type'] = 'info') {
  toastQueue.forEach(fn => fn({ id: Math.random().toString(36), message, type }))
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const fn = (t: Toast) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4000)
    }
    toastQueue.push(fn)
    return () => { toastQueue = toastQueue.filter(f => f !== fn) }
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in
          ${t.type === 'success' ? 'bg-emerald-500 text-white' : t.type === 'error' ? 'bg-destructive text-white' : 'glass-card'}`}>
          {t.message}
          <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
