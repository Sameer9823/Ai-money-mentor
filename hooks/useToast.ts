'use client'
import { useState, useCallback } from 'react'

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = Math.random().toString(36)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, show, dismiss }
}

// Global toast trigger (for use outside React components)
export const toastQueue: Array<(msg: string, type?: 'success' | 'error' | 'info') => void> = []

export function triggerToast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
  toastQueue.forEach(fn => fn(msg, type))
}
