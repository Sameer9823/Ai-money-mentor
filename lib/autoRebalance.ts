import { PortfolioFund } from '@/types/agents'
import { portfolioOverlapAnalyzer } from '@/tools/financialTools'

export interface RebalanceMove {
  from: string
  to: string
  amount: number
  reason: string
  urgency: 'immediate' | 'this-month' | 'next-quarter'
}

export interface RebalanceTarget {
  category: string
  currentPct: number
  targetPct: number
  delta: number
  action: 'increase' | 'decrease' | 'hold'
}

export interface AutoRebalanceOutput {
  needsRebalancing: boolean
  imbalanceScore: number      // 0-100, higher = more out of balance
  moves: RebalanceMove[]
  targets: RebalanceTarget[]
  expenseSavings: number      // annual ₹ saved by switching to cheaper funds
  summary: string
}

// Target allocations by risk profile
const TARGET_ALLOCATIONS: Record<string, Record<string, number>> = {
  conservative: {
    'Large Cap': 20, 'Index': 10, 'Debt': 40, 'Hybrid': 20, 'Gold': 10,
  },
  moderate: {
    'Large Cap': 25, 'Mid Cap': 15, 'Index': 15, 'Flexi Cap': 15,
    'Debt': 20, 'Gold': 10,
  },
  aggressive: {
    'Large Cap': 20, 'Mid Cap': 20, 'Small Cap': 15, 'Index': 15,
    'Flexi Cap': 15, 'Sectoral': 10, 'Gold': 5,
  },
}

// Cheap index alternatives for expensive active funds
const CHEAPER_ALTERNATIVES: Record<string, string> = {
  'Large Cap':  'Nifty 50 Index Fund (ER ~0.1%)',
  'Mid Cap':    'Nifty Midcap 150 Index Fund (ER ~0.3%)',
  'Flexi Cap':  'Parag Parikh Flexi Cap (ER ~0.6%)',
  'Debt':       'Nifty SDL Index Fund (ER ~0.1%)',
}

export function autoRebalance(
  funds: PortfolioFund[],
  riskProfile: string = 'moderate',
  totalValue?: number
): AutoRebalanceOutput {
  if (!funds || funds.length === 0) {
    return {
      needsRebalancing: false,
      imbalanceScore: 0,
      moves: [],
      targets: [],
      expenseSavings: 0,
      summary: 'No funds provided for analysis.',
    }
  }

  const total = totalValue ?? funds.reduce((s, f) => s + f.currentValue, 0)
  if (total === 0) return { needsRebalancing: false, imbalanceScore: 0, moves: [], targets: [], expenseSavings: 0, summary: '' }

  const overlap = portfolioOverlapAnalyzer(funds)
  const targets = TARGET_ALLOCATIONS[riskProfile] ?? TARGET_ALLOCATIONS.moderate

  // Current allocation by category
  const currentAlloc: Record<string, number> = {}
  const categoryFunds: Record<string, PortfolioFund[]> = {}
  for (const f of funds) {
    currentAlloc[f.category] = (currentAlloc[f.category] ?? 0) + f.currentValue
    categoryFunds[f.category] = [...(categoryFunds[f.category] ?? []), f]
  }

  // Convert to percentages
  const currentPct: Record<string, number> = {}
  for (const [cat, val] of Object.entries(currentAlloc)) {
    currentPct[cat] = Math.round((val / total) * 100)
  }

  // Calculate imbalance
  const rebalanceTargets: RebalanceTarget[] = []
  let totalDrift = 0

  for (const [cat, targetPct] of Object.entries(targets)) {
    const cur = currentPct[cat] ?? 0
    const delta = cur - targetPct
    totalDrift += Math.abs(delta)
    rebalanceTargets.push({
      category: cat,
      currentPct: cur,
      targetPct,
      delta,
      action: Math.abs(delta) < 3 ? 'hold' : delta > 0 ? 'decrease' : 'increase',
    })
  }

  // Also flag categories not in target (unexpected holdings)
  for (const [cat, pct] of Object.entries(currentPct)) {
    if (!(cat in targets) && pct > 10) {
      rebalanceTargets.push({
        category: cat,
        currentPct: pct,
        targetPct: 0,
        delta: pct,
        action: 'decrease',
      })
    }
  }

  const imbalanceScore = Math.min(100, Math.round(totalDrift * 2))
  const needsRebalancing = imbalanceScore > 20 || overlap.overlapScore > 40

  // Generate specific moves
  const moves: RebalanceMove[] = []

  // Move 1: Merge duplicate large caps into index
  if (overlap.duplicateCategories.length > 0) {
    for (const dupCat of overlap.duplicateCategories) {
      const catFunds = categoryFunds[dupCat] ?? []
      if (catFunds.length > 1) {
        // Sort by expense ratio descending — sell the expensive one
        const sorted = [...catFunds].sort((a, b) => (b.expenseRatio ?? 1) - (a.expenseRatio ?? 1))
        const expensiveFund = sorted[0]
        const cheapAlternative = CHEAPER_ALTERNATIVES[dupCat] ?? `${dupCat} Index Fund`
        const moveAmount = Math.round(expensiveFund.currentValue * 0.5)

        if (moveAmount > 5000) {
          moves.push({
            from: expensiveFund.name || expensiveFund.category,
            to: cheapAlternative,
            amount: moveAmount,
            reason: `Duplicate ${dupCat} fund with ER ${expensiveFund.expenseRatio ?? 1}% — consolidate into cheaper alternative`,
            urgency: 'this-month',
          })
        }
      }
    }
  }

  // Move 2: Rebalance overweight categories
  const overweight = rebalanceTargets.filter(t => t.delta > 10 && t.action === 'decrease')
  const underweight = rebalanceTargets.filter(t => t.delta < -10 && t.action === 'increase')

  for (let i = 0; i < Math.min(overweight.length, underweight.length, 3); i++) {
    const from = overweight[i]
    const to = underweight[i]
    const fromFunds = categoryFunds[from.category] ?? []
    const moveAmount = Math.round((from.delta / 100) * total * 0.5)

    if (moveAmount > 5000 && fromFunds.length > 0) {
      moves.push({
        from: fromFunds[0].name || from.category,
        to: CHEAPER_ALTERNATIVES[to.category] ?? `${to.category} Fund`,
        amount: moveAmount,
        reason: `${from.category} is ${from.delta}% overweight vs target ${from.targetPct}%. Move to ${to.category} which is ${Math.abs(to.delta)}% underweight.`,
        urgency: from.delta > 20 ? 'immediate' : 'this-month',
      })
    }
  }

  // Move 3: High expense ratio funds
  const expensiveFunds = funds.filter(f => (f.expenseRatio ?? 0) > 1.5)
  for (const ef of expensiveFunds.slice(0, 2)) {
    const annual = Math.round(ef.currentValue * (ef.expenseRatio ?? 0) / 100)
    const saving = Math.round(ef.currentValue * ((ef.expenseRatio ?? 0) - 0.2) / 100)
    if (saving > 2000) {
      moves.push({
        from: ef.name || ef.category,
        to: CHEAPER_ALTERNATIVES[ef.category] ?? `${ef.category} Index Fund`,
        amount: ef.currentValue,
        reason: `High expense ratio ${ef.expenseRatio}% costs ₹${annual.toLocaleString('en-IN')}/yr. Switch saves ₹${saving.toLocaleString('en-IN')}/yr.`,
        urgency: 'next-quarter',
      })
    }
  }

  // Calculate total expense savings
  const currentAnnualCost = funds.reduce((s, f) => s + f.currentValue * ((f.expenseRatio ?? 1) / 100), 0)
  const optimizedCost = total * 0.002   // 0.2% average for index funds
  const expenseSavings = Math.max(0, Math.round(currentAnnualCost - optimizedCost))

  const summary = needsRebalancing
    ? `Portfolio needs rebalancing (drift score: ${imbalanceScore}/100). ${moves.length} specific moves identified.${expenseSavings > 0 ? ` Switching to index funds saves ₹${expenseSavings.toLocaleString('en-IN')}/year in expenses.` : ''}`
    : `Portfolio is well-balanced (drift score: ${imbalanceScore}/100). Continue current SIPs.`

  return { needsRebalancing, imbalanceScore, moves, targets: rebalanceTargets, expenseSavings, summary }
}