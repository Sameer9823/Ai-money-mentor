/**
 * TOOL LAYER — Pure deterministic functions
 * NO LLM calls here. These are called by agents.
 */

import { MutualFundNAV, PortfolioFund } from '@/types/agents'

// ─── In-memory NAV cache (avoids Next.js 2MB cache limit) ────────────────
let navCache: { data: Map<string, MutualFundNAV>; fetchedAt: number } | null = null
const NAV_CACHE_TTL = 60 * 60 * 1000 // 1 hour in ms

async function fetchAMFIText(): Promise<string> {
  const res = await fetch('https://www.amfiindia.com/spages/NAVAll.txt', {
    cache: 'no-store', // bypass Next.js cache entirely — we handle caching ourselves
  })
  if (!res.ok) throw new Error('AMFI fetch failed')
  return res.text()
}

function parseNAVText(text: string): Map<string, MutualFundNAV> {
  const map = new Map<string, MutualFundNAV>()
  for (const line of text.split('\n')) {
    const parts = line.split(';')
    if (parts.length >= 5) {
      const nav = parseFloat(parts[4]?.trim())
      const name = parts[3]?.trim()
      if (!isNaN(nav) && name) {
        map.set(name.toLowerCase(), {
          schemeCode: parts[0]?.trim() ?? '',
          schemeName: name,
          nav,
          date: parts[5]?.trim() ?? '',
        })
      }
    }
  }
  return map
}

// ─── 1. getMutualFundNAV ───────────────────────────────────────────────────
export async function getMutualFundNAV(
  schemeName: string
): Promise<MutualFundNAV | null> {
  try {
    const navMap = await getAllNAVs()
    return navMap.get(schemeName.toLowerCase()) ?? null
  } catch {
    return null
  }
}

export async function getAllNAVs(): Promise<Map<string, MutualFundNAV>> {
  // Return from memory cache if still fresh
  if (navCache && Date.now() - navCache.fetchedAt < NAV_CACHE_TTL) {
    return navCache.data
  }
  try {
    const text = await fetchAMFIText()
    const data = parseNAVText(text)
    navCache = { data, fetchedAt: Date.now() }
    return data
  } catch {
    // Return stale cache if available, else empty map
    return navCache?.data ?? new Map()
  }
}

// ─── 2. calculateXIRR ─────────────────────────────────────────────────────
export function calculateXIRR(
  cashflows: Array<{ date: Date; amount: number }>
): number {
  if (cashflows.length < 2) return 0
  let rate = 0.1
  for (let iter = 0; iter < 200; iter++) {
    let npv = 0
    let dnpv = 0
    const t0 = cashflows[0].date.getTime()
    for (const cf of cashflows) {
      const t = (cf.date.getTime() - t0) / (365.25 * 24 * 3600 * 1000)
      const denom = Math.pow(1 + rate, t)
      npv += cf.amount / denom
      dnpv += (-t * cf.amount) / (denom * (1 + rate))
    }
    if (Math.abs(dnpv) < 1e-10) break
    const newRate = rate - npv / dnpv
    if (Math.abs(newRate - rate) < 1e-8) return newRate * 100
    rate = newRate
    if (rate < -0.99) rate = -0.5
  }
  return rate * 100
}

// ─── 3. taxCalculatorIndia ────────────────────────────────────────────────
export interface TaxResult {
  oldRegime: { taxableIncome: number; tax: number; effectiveRate: number }
  newRegime: { taxableIncome: number; tax: number; effectiveRate: number }
  recommendation: 'old' | 'new'
  savings: number
  hraExemption: number
}

export function taxCalculatorIndia(params: {
  basicSalary: number
  hra: number
  specialAllowance: number
  otherIncome: number
  rentPaid?: number
  isMetro?: boolean
  section80C?: number
  section80D?: number
  nps?: number
  homeLoanInterest?: number
  otherDeductions?: number
}): TaxResult {
  const gross = params.basicSalary + params.hra + params.specialAllowance + params.otherIncome

  // HRA exemption (old regime only)
  let hraExemption = 0
  if (params.rentPaid && params.rentPaid > 0) {
    const monthly = params.rentPaid
    const annual = monthly * 12
    const hraReceived = params.hra
    const basic = params.basicSalary
    const metaFactor = params.isMetro ? 0.5 : 0.4
    hraExemption = Math.min(
      hraReceived,
      Math.max(0, annual - basic * 0.1),
      basic * metaFactor
    )
  }

  // Old regime deductions
  const std = 50000
  const s80C = Math.min(params.section80C ?? 0, 150000)
  const s80D = Math.min(params.section80D ?? 0, 50000)
  const nps = Math.min(params.nps ?? 0, 50000)
  const hl = Math.min(params.homeLoanInterest ?? 0, 200000)
  const other = params.otherDeductions ?? 0
  const totalOldDeductions = std + hraExemption + s80C + s80D + nps + hl + other

  const oldTaxable = Math.max(0, gross - totalOldDeductions)
  const oldTax = computeOldRegimeTax(oldTaxable)

  // New regime — standard deduction ₹75k (FY25), no other deductions
  const newTaxable = Math.max(0, gross - 75000)
  const newTax = computeNewRegimeTax(newTaxable)

  const recommendation = oldTax <= newTax ? 'old' : 'new'
  const savings = Math.abs(oldTax - newTax)

  return {
    oldRegime: { taxableIncome: oldTaxable, tax: oldTax, effectiveRate: gross > 0 ? (oldTax / gross) * 100 : 0 },
    newRegime: { taxableIncome: newTaxable, tax: newTax, effectiveRate: gross > 0 ? (newTax / gross) * 100 : 0 },
    recommendation,
    savings,
    hraExemption,
  }
}

function computeOldRegimeTax(income: number): number {
  if (income <= 250000) return 0
  let tax = 0
  if (income <= 500000) tax = (income - 250000) * 0.05
  else if (income <= 1000000) tax = 12500 + (income - 500000) * 0.2
  else tax = 112500 + (income - 1000000) * 0.3
  if (income <= 500000) tax = 0 // 87A rebate
  if (income > 5000000) tax += tax * 0.1 // surcharge
  return Math.round(tax * 1.04) // 4% cess
}

function computeNewRegimeTax(income: number): number {
  if (income <= 300000) return 0
  let tax = 0
  if (income <= 600000) tax = (income - 300000) * 0.05
  else if (income <= 900000) tax = 15000 + (income - 600000) * 0.1
  else if (income <= 1200000) tax = 45000 + (income - 900000) * 0.15
  else if (income <= 1500000) tax = 90000 + (income - 1200000) * 0.2
  else tax = 150000 + (income - 1500000) * 0.3
  if (income <= 700000) tax = 0 // 87A new regime rebate
  return Math.round(tax * 1.04)
}

// ─── 4. portfolioOverlapAnalyzer ──────────────────────────────────────────
export interface OverlapResult {
  overlapScore: number // 0-100, higher = more overlap
  duplicateCategories: string[]
  categoryConcentration: Record<string, number>
  expenseRatioDrag: number
  totalExpenseAnnual: number
  diversificationScore: number // 0-100, higher = better
}

export function portfolioOverlapAnalyzer(funds: PortfolioFund[]): OverlapResult {
  const totalValue = funds.reduce((s, f) => s + f.currentValue, 0)
  if (totalValue === 0) return {
    overlapScore: 0, duplicateCategories: [], categoryConcentration: {},
    expenseRatioDrag: 0, totalExpenseAnnual: 0, diversificationScore: 0,
  }

  // Category concentration
  const catMap: Record<string, number> = {}
  for (const f of funds) {
    catMap[f.category] = (catMap[f.category] ?? 0) + f.currentValue
  }
  const categoryConcentration: Record<string, number> = {}
  for (const [cat, val] of Object.entries(catMap)) {
    categoryConcentration[cat] = Math.round((val / totalValue) * 100)
  }

  // Duplicate categories (same category > 1 fund)
  const catCounts: Record<string, number> = {}
  for (const f of funds) catCounts[f.category] = (catCounts[f.category] ?? 0) + 1
  const duplicateCategories = Object.entries(catCounts)
    .filter(([, count]) => count > 1)
    .map(([cat]) => cat)

  // Overlap score — based on duplicate categories and concentration
  const largeCap = categoryConcentration['Large Cap'] ?? 0
  const overlapScore = Math.min(100, duplicateCategories.length * 20 + (largeCap > 60 ? 30 : 0))

  // Expense ratio drag
  const weightedER = funds.reduce((s, f) => {
    const weight = f.currentValue / totalValue
    return s + weight * (f.expenseRatio ?? 1.0)
  }, 0)
  const totalExpenseAnnual = Math.round(totalValue * (weightedER / 100))

  // Diversification score
  const categories = Object.keys(catMap).length
  const diversificationScore = Math.min(100, categories * 15 + (duplicateCategories.length === 0 ? 25 : 0))

  return {
    overlapScore: Math.round(overlapScore),
    duplicateCategories,
    categoryConcentration,
    expenseRatioDrag: Math.round(weightedER * 100) / 100,
    totalExpenseAnnual,
    diversificationScore: Math.round(diversificationScore),
  }
}

// ─── 5. SIP & corpus calculators ──────────────────────────────────────────
export function calculateSIPMaturity(monthly: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12
  const n = years * 12
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
}

export function calculateRequiredSIP(target: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12
  const n = years * 12
  return (target * r) / ((Math.pow(1 + r, n) - 1) * (1 + r))
}

export function calculateRetirementCorpus(
  monthlyExpenses: number,
  years = 25,
  inflation = 6,
  returnRate = 7
): number {
  const real = (1 + returnRate / 100) / (1 + inflation / 100) - 1
  if (Math.abs(real) < 0.0001) return monthlyExpenses * 12 * years
  return (monthlyExpenses * 12 * (1 - Math.pow(1 + real, -years))) / real
}

// ─── 6. parsePDF (server-side) ────────────────────────────────────────────
export async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import for server-side only
    const pdfParse = await import('pdf-parse')
    const data = await pdfParse.default(buffer)
    return data.text
  } catch {
    throw new Error('PDF_PARSE_FAILED')
  }
}

// ─── 7. Financial formatters ──────────────────────────────────────────────
export function formatCurrency(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

export function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

// ─── 8. Risk scoring ──────────────────────────────────────────────────────
export function computeRiskScore(params: {
  debtToIncome: number
  emergencyMonths: number
  insuranceCoverage: boolean
  equityPct: number
  age: number
}): { score: number; level: 'low' | 'medium' | 'high'; flags: string[] } {
  const flags: string[] = []
  let score = 100

  if (params.debtToIncome > 0.5) { score -= 30; flags.push('High debt-to-income ratio') }
  else if (params.debtToIncome > 0.3) { score -= 15; flags.push('Moderate debt burden') }

  if (params.emergencyMonths < 3) { score -= 25; flags.push('Inadequate emergency fund') }
  else if (params.emergencyMonths < 6) { score -= 10; flags.push('Emergency fund below 6 months') }

  if (!params.insuranceCoverage) { score -= 20; flags.push('No term insurance detected') }

  const ageBasedMaxEquity = Math.max(20, 100 - params.age)
  if (params.equityPct > ageBasedMaxEquity + 20) {
    score -= 15; flags.push(`Equity allocation (${params.equityPct}%) too high for age ${params.age}`)
  }

  const level = score >= 70 ? 'low' : score >= 40 ? 'medium' : 'high'
  return { score: Math.max(0, score), level, flags }
}