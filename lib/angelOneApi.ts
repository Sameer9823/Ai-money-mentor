/**
 * Angel One SmartAPI Integration
 * FREE API — https://smartapi.angelbroking.com/
 *
 * Provides:
 * - OAuth login for user authentication
 * - Real portfolio holdings (stocks + MF)
 * - Live market data
 * - Historical prices for XIRR calculation
 *
 * Setup:
 * 1. Register at https://smartapi.angelbroking.com/
 * 2. Create an app → get API_KEY
 * 3. Add ANGEL_ONE_API_KEY to .env.local
 */

import crypto from 'crypto'

const BASE_URL = 'https://apiconnect.angelbroking.com'
const API_KEY  = process.env.ANGEL_ONE_API_KEY ?? ''

export interface AngelHolding {
  tradingsymbol:   string
  symboltoken:     string
  isin:            string
  exchange:        string
  t1quantity:      number
  realisedquantity: number
  quantity:        number
  authorisedquantity: number
  product:         string
  collateralquantity: number | null
  collateraltype:  string | null
  haircut:         number
  profitandloss:   string
  close:           number
  ltp:             number
  symbolname:      string
  averageprice:    number
}

export interface AngelPortfolioSummary {
  holdings:       AngelHolding[]
  totalValue:     number
  totalInvested:  number
  totalPnL:       number
  totalPnLPct:    number
  fetchedAt:      string
}

// ── 1. Generate OAuth login URL ─────────────────────────────────────────────
export function getAngelOneLoginUrl(state: string): string {
  // Angel One uses a custom auth flow
  // User logs in on Angel One portal → redirected back with auth_token
  const redirectUri = encodeURIComponent(`${process.env.NEXTAUTH_URL}/api/broker/callback`)
  return `https://smartapi.angelbroking.com/publisher-login?api_key=${API_KEY}&state=${state}&redirect_uri=${redirectUri}`
}

// ── 2. Exchange auth_token for JWT ──────────────────────────────────────────
export async function generateSession(
  clientCode: string,
  password: string,  // MPIN
  totp: string       // TOTP from authenticator app
): Promise<{ jwtToken: string; refreshToken: string; feedToken: string } | null> {
  try {
    const res = await fetch(`${BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':        'application/json',
        'X-UserType':    'USER',
        'X-SourceID':    'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress':  '00:00:00:00:00:00',
        'X-PrivateKey':  API_KEY,
      },
      body: JSON.stringify({ clientcode: clientCode, password, totp }),
    })
    const data = await res.json()
    if (data.status && data.data?.jwtToken) {
      return {
        jwtToken:     data.data.jwtToken,
        refreshToken: data.data.refreshToken,
        feedToken:    data.data.feedToken,
      }
    }
    return null
  } catch { return null }
}

// ── 3. Fetch all holdings ───────────────────────────────────────────────────
export async function fetchHoldings(jwtToken: string): Promise<AngelHolding[]> {
  try {
    const res = await fetch(`${BASE_URL}/rest/secure/angelbroking/portfolio/v1/getAllHolding`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'X-UserType':    'USER',
        'X-SourceID':    'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress':  '00:00:00:00:00:00',
        'X-PrivateKey':  API_KEY,
      },
    })
    const data = await res.json()
    return data.data?.holdings ?? []
  } catch { return [] }
}

// ── 4. Get portfolio summary ────────────────────────────────────────────────
export async function getPortfolioSummary(jwtToken: string): Promise<AngelPortfolioSummary> {
  const holdings = await fetchHoldings(jwtToken)

  let totalValue    = 0
  let totalInvested = 0

  for (const h of holdings) {
    const currentValue = (h.quantity + h.t1quantity) * h.ltp
    const invested     = (h.quantity + h.t1quantity) * h.averageprice
    totalValue    += currentValue
    totalInvested += invested
  }

  const totalPnL    = totalValue - totalInvested
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

  return {
    holdings,
    totalValue:     Math.round(totalValue),
    totalInvested:  Math.round(totalInvested),
    totalPnL:       Math.round(totalPnL),
    totalPnLPct:    Math.round(totalPnLPct * 100) / 100,
    fetchedAt:      new Date().toISOString(),
  }
}

// ── 5. Get LTP for symbols ──────────────────────────────────────────────────
export async function getLTP(
  jwtToken: string,
  symbols: Array<{ exchange: string; tradingsymbol: string; symboltoken: string }>
): Promise<Record<string, number>> {
  try {
    const res = await fetch(`${BASE_URL}/rest/secure/angelbroking/market/v1/quote/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'X-UserType':    'USER',
        'X-SourceID':    'WEB',
        'X-PrivateKey':  API_KEY,
      },
      body: JSON.stringify({ mode: 'LTP', exchangeTokens: { NSE: symbols.map(s => s.symboltoken) } }),
    })
    const data = await res.json()
    const result: Record<string, number> = {}
    for (const item of data.data?.fetched ?? []) {
      result[item.tradingSymbol] = item.ltp
    }
    return result
  } catch { return {} }
}

// ── 6. Convert Angel holdings to PortfolioFund format ──────────────────────
export function holdingsToPortfolioFunds(holdings: AngelHolding[]) {
  return holdings.map(h => ({
    name:          h.symbolname || h.tradingsymbol,
    category:      inferStockCategory(h.tradingsymbol, h.symbolname),
    investedAmount: Math.round((h.quantity + h.t1quantity) * h.averageprice),
    currentValue:  Math.round((h.quantity + h.t1quantity) * h.ltp),
    units:         h.quantity + h.t1quantity,
    nav:           h.ltp,
    expenseRatio:  0, // stocks have 0 expense ratio
    purchaseDate:  '',
    isin:          h.isin,
    exchange:      h.exchange,
  }))
}

function inferStockCategory(symbol: string, name: string): string {
  const n = (name || symbol).toLowerCase()
  // Large cap Nifty 50 stocks
  const nifty50 = ['reliance', 'tcs', 'hdfc', 'infosys', 'icici', 'kotak', 'axis', 'sbi', 'wipro', 'hcl', 'bajaj', 'maruti', 'titan', 'lt', 'asian paint', 'nestle', 'ultratech']
  if (nifty50.some(s => n.includes(s))) return 'Large Cap'
  // ETFs
  if (n.includes('etf') || n.includes('bees') || n.includes('nifty') || n.includes('sensex')) return 'Index ETF'
  // Midcap indicators
  if (symbol.length > 8) return 'Mid Cap'
  return 'Large Cap'
}

// ── 7. Free NSE market data (no auth needed) ────────────────────────────────
export async function getNSEIndexData(): Promise<{
  nifty50: number
  sensex: number
  niftyMidcap: number
  timestamp: string
} | null> {
  try {
    // NSE India public API — no key needed
    const res = await fetch('https://www.nseindia.com/api/allIndices', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const indices = data.data ?? []

    const find = (name: string) => indices.find((i: { index: string; last: number }) => i.index === name)?.last ?? 0

    return {
      nifty50:     find('NIFTY 50'),
      sensex:      find('SENSEX'),
      niftyMidcap: find('NIFTY MIDCAP 100'),
      timestamp:   new Date().toISOString(),
    }
  } catch { return null }
}

// ── 8. RBI policy rate (free public API) ────────────────────────────────────
export async function getRBIPolicyRate(): Promise<number> {
  try {
    const res = await fetch('https://api.rbi.org.in/api/v1/policyrates', {
      headers: { 'Accept': 'application/json' },
    })
    if (res.ok) {
      const data = await res.json()
      return data?.repoRate ?? 6.5
    }
  } catch {}
  return 6.5 // fallback to current rate
}