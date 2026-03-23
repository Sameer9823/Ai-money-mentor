/**
 * Month-by-month FIRE roadmap generator
 * Shows corpus growth, SIP milestones and asset allocation shifts year by year
 */

export interface RoadmapMilestone {
  year: number
  age: number
  corpus: number
  sipAmount: number
  equityPct: number
  debtPct: number
  goldPct: number
  action: string
}

export interface FireRoadmap {
  milestones: RoadmapMilestone[]
  totalMonths: number
  finalCorpus: number
  requiredCorpus: number
  achievesGoal: boolean
  yearAchieved: number | null
}

export function generateFireRoadmap(input: {
  age: number
  retirementAge: number
  monthlyIncome: number
  monthlyExpenses: number
  currentSavings: number
  monthlySIP: number
  riskProfile: string
}): FireRoadmap {
  const {
    age, retirementAge, monthlyIncome, monthlyExpenses,
    currentSavings, monthlySIP, riskProfile,
  } = input

  const yearsToRetire = retirementAge - age
  const monthlyExpensesAtRetirement = monthlyExpenses * Math.pow(1.06, yearsToRetire) // 6% inflation
  const requiredCorpus = monthlyExpensesAtRetirement * 12 * 25 // 4% withdrawal rule

  const milestones: RoadmapMilestone[] = []
  let corpus = currentSavings
  let currentSIP = monthlySIP
  let yearAchieved: number | null = null

  for (let yr = 1; yr <= yearsToRetire; yr++) {
    const currentAge = age + yr

    // Glide path: equity reduces as user ages
    const rawEquity = riskProfile === 'aggressive' ? 90 - yr * 1.5
      : riskProfile === 'conservative' ? 60 - yr * 1.2
      : 80 - yr * 1.5
    const equity = Math.max(20, Math.min(90, Math.round(rawEquity)))
    const gold   = Math.min(15, 5 + Math.floor(yr / 4))
    const debt   = 100 - equity - gold

    // Blended return based on allocation
    const annualReturn = (equity / 100) * 0.13 + (debt / 100) * 0.07 + (gold / 100) * 0.09

    // Grow existing corpus
    corpus = corpus * (1 + annualReturn)

    // Add 12 months of SIP (monthly compounding)
    const monthlyReturn = annualReturn / 12
    for (let m = 0; m < 12; m++) {
      corpus += currentSIP * Math.pow(1 + monthlyReturn, 12 - m)
    }

    // Increase SIP by 10% every year (step-up SIP)
    currentSIP = Math.round(currentSIP * 1.10)

    // Key action for this year
    let action = ''
    if (yr === 1)                       action = 'Start SIPs + build emergency fund to 6 months'
    else if (yr === 2)                  action = 'Max 80C + get term insurance if not done'
    else if (yr === 3)                  action = 'Increase SIP after annual raise. Review portfolio overlap'
    else if (yr === 5)                  action = 'Step up SIP by 20%. Add international fund for diversification'
    else if (yr === Math.floor(yearsToRetire * 0.4)) action = '40% of journey done — rebalance allocation, review goals'
    else if (yr === Math.floor(yearsToRetire * 0.6)) action = 'Shift 5% from equity to debt. Consolidate overlapping funds'
    else if (yr === Math.floor(yearsToRetire * 0.8)) action = 'Start moving equity gains to debt/FD ladder'
    else if (yr === yearsToRetire - 3)  action = '3 years left — move 30% to capital-protected instruments'
    else if (yr === yearsToRetire - 1)  action = 'Final year — set up SWP plan, open retirement account'
    else if (yr === yearsToRetire)      action = 'Retirement! Activate SWP at 4% annual withdrawal'
    else {                              action = `Maintain SIP of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(currentSIP)}/mo. Rebalance annually` }

    if (!yearAchieved && corpus >= requiredCorpus) yearAchieved = yr + age

    milestones.push({
      year: yr,
      age: currentAge,
      corpus: Math.round(corpus),
      sipAmount: currentSIP,
      equityPct: equity,
      debtPct: debt,
      goldPct: gold,
      action,
    })
  }

  return {
    milestones,
    totalMonths: yearsToRetire * 12,
    finalCorpus: Math.round(corpus),
    requiredCorpus: Math.round(requiredCorpus),
    achievesGoal: corpus >= requiredCorpus,
    yearAchieved,
  }
}

export function formatCr(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}