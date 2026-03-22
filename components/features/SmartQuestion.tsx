'use client'
import { useState, useEffect } from 'react'
import { HelpCircle, ChevronRight, CheckCircle2 } from 'lucide-react'

interface Question {
  id: string
  question: string
  field: string
  type: 'boolean' | 'number' | 'select' | 'text'
  options?: string[]
  unit?: string
  impactOnScore: number
}

export default function SmartQuestion() {
  const [question, setQuestion] = useState<Question | null>(null)
  const [answer, setAnswer] = useState('')
  const [saving, setSaving] = useState(false)
  const [answered, setAnswered] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/questions')
      .then(r => r.ok ? r.json() : { question: null })
      .then(d => setQuestion(d.question))
      .catch(() => {})
  }, [])

  if (dismissed || !question) return null

  async function handleSubmit() {
    if (!question || !answer) return
    setSaving(true)
    try {
      let val: unknown = answer
      if (question.type === 'boolean') val = answer === 'true'
      if (question.type === 'number') val = Number(answer)
      await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: question.field, value: val }),
      })
      setAnswered(true)
      setTimeout(() => setDismissed(true), 1500)
    } catch {}
    finally { setSaving(false) }
  }

  return (
    <div className="glass-card rounded-2xl p-4 border border-primary/20 bg-primary/5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <HelpCircle className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Quick Question</span>
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              +{question.impactOnScore}% accuracy
            </span>
          </div>
          <p className="text-sm font-medium mb-3">{question.question}</p>

          {answered ? (
            <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Saved! Analysis updated.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {question.type === 'boolean' && ['Yes', 'No'].map(opt => (
                <button key={opt} onClick={() => setAnswer(opt === 'Yes' ? 'true' : 'false')}
                  className={`px-4 py-1.5 rounded-xl text-sm font-medium border transition-all
                    ${answer === (opt === 'Yes' ? 'true' : 'false')
                      ? 'bg-primary text-white border-primary'
                      : 'border-border hover:border-primary/50'}`}>
                  {opt}
                </button>
              ))}

              {question.type === 'select' && question.options?.map(opt => (
                <button key={opt} onClick={() => setAnswer(opt)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all
                    ${answer === opt ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/50'}`}>
                  {opt}
                </button>
              ))}

              {question.type === 'number' && (
                <input type="number" value={answer} onChange={e => setAnswer(e.target.value)}
                  placeholder={`Enter ${question.unit ?? 'amount'}`}
                  className="input-field w-40 py-1.5 text-sm" />
              )}

              {answer && (
                <button onClick={handleSubmit} disabled={saving}
                  className="flex items-center gap-1 bg-primary text-white text-sm px-3 py-1.5 rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" /> Save
                </button>
              )}
              <button onClick={() => setDismissed(true)}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5">
                Skip
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}