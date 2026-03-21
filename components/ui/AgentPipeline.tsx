'use client'
import { CheckCircle2, Loader2, Circle } from 'lucide-react'

interface AgentPipelineProps {
  steps: string[]
  loading: boolean
}

export default function AgentPipeline({ steps, loading }: AgentPipelineProps) {
  if (steps.length === 0 && !loading) return null

  const allSteps = steps.length > 0 ? steps : ['🧠 Initializing agents...']

  return (
    <div className="glass-card rounded-2xl p-5 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        Agent Pipeline
      </div>
      {allSteps.map((step, i) => {
        const isLast = i === allSteps.length - 1
        const isDone = !loading || !isLast
        return (
          <div key={i} className={`flex items-center gap-3 text-sm transition-all duration-300 ${isDone && !isLast ? 'text-muted-foreground' : 'text-foreground'}`}>
            {loading && isLast ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
            ) : isDone ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <span className={loading && isLast ? 'text-primary font-medium' : ''}>{step}</span>
          </div>
        )
      })}
    </div>
  )
}
