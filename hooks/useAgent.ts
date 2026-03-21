'use client'
import { useState, useCallback } from 'react'
import { TaskType } from '@/types/agents'
import { ExecutionOutput } from '@/agents/executionAgent'

interface AgentState {
  loading: boolean
  result: ExecutionOutput | null
  error: string | null
  stepTrace: string[]
}

export function useAgent() {
  const [state, setState] = useState<AgentState>({
    loading: false,
    result: null,
    error: null,
    stepTrace: [],
  })

  const run = useCallback(async (
    taskType: TaskType,
    input: Record<string, unknown>
  ): Promise<ExecutionOutput | null> => {
    setState({ loading: true, result: null, error: null, stepTrace: [] })

    // Simulated step trace for UI feedback
    const steps = getStepLabels(taskType)
    let stepIdx = 0
    const interval = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        stepIdx++
        setState(prev => ({ ...prev, stepTrace: steps.slice(0, stepIdx + 1) }))
      }
    }, 800)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType, ...input }),
      })

      clearInterval(interval)

      if (!res.ok) {
        const err = await res.json()
        setState(prev => ({
          ...prev,
          loading: false,
          error: err.error ?? 'Agent failed',
          stepTrace: steps,
        }))
        return null
      }

      const data: ExecutionOutput = await res.json()
      setState({ loading: false, result: data, error: null, stepTrace: steps })
      return data
    } catch (err) {
      clearInterval(interval)
      setState(prev => ({
        ...prev,
        loading: false,
        error: String(err),
        stepTrace: steps,
      }))
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState({ loading: false, result: null, error: null, stepTrace: [] })
  }, [])

  return { ...state, run, reset }
}

function getStepLabels(taskType: TaskType): string[] {
  const base = [
    '🧠 Orchestrator initializing...',
    '💾 Loading your memory & history...',
    '📡 Data Agent fetching market data...',
    '🔢 Analysis Agent computing metrics...',
    '🤖 Planning Agent generating strategy...',
    '🛡 Risk Agent validating compliance...',
    '⚡ Execution Agent assembling output...',
    '💾 Saving to memory...',
    '✅ Done!',
  ]

  const extras: Partial<Record<TaskType, string[]>> = {
    portfolio_xray: ['📊 Fetching live NAVs from AMFI...', '🔍 Analyzing fund overlap...'],
    tax_wizard: ['📄 Parsing tax data...', '⚖️ Comparing old vs new regime...'],
    couples_plan: ['👫 Optimizing joint income...', '🏠 Calculating HRA optimization...'],
  }

  const extra = extras[taskType] ?? []
  return [...base.slice(0, 3), ...extra, ...base.slice(3)]
}
