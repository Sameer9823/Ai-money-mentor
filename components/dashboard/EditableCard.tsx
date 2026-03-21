'use client'
import { useState, ReactNode } from 'react'
import { Pencil, Check, X } from 'lucide-react'

interface EditableCardProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  editContent?: ReactNode
  onSave?: () => Promise<void>
  onCancel?: () => void
  className?: string
  badge?: ReactNode
}

export default function EditableCard({
  title, icon, children, editContent, onSave, onCancel, className = '', badge,
}: EditableCardProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditing(false)
    onCancel?.()
  }

  return (
    <div className={`glass-card rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-display font-semibold">{title}</h3>
          {badge}
        </div>
        {editContent && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {editing && (
          <div className="flex gap-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 text-xs bg-secondary text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        )}
      </div>
      {editing && editContent ? editContent : children}
    </div>
  )
}
