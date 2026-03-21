'use client'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open, title, message, confirmLabel = 'Delete', danger = true, onConfirm, onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      {/* Modal */}
      <div className="relative glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
        <button onClick={onCancel} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${danger ? 'bg-destructive/10' : 'bg-amber-500/10'}`}>
          <AlertTriangle className={`w-6 h-6 ${danger ? 'text-destructive' : 'text-amber-500'}`} />
        </div>
        <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-secondary justify-center py-2.5">Cancel</button>
          <button
            onClick={() => { onConfirm(); }}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${danger ? 'bg-destructive text-white hover:bg-destructive/90' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
