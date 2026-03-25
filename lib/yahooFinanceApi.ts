/**
 * FREE Market Data via Yahoo Finance
 * ✅ No API key required
 * ✅ No registration needed
 * ✅ Works immediately
 *
 * Supports NSE stocks (symbol.NS) and BSE (symbol.BO)
 * Already used in benchmark API — extended here for portfolio
 */

export interface StockQuote {
  symbol:       string
  name:         string
  price:        number
  change:       number
  changePct:    number
  prevClose:    number
  marketCap:    number
  peRatio:      number
  exchange:     string
  currency:     string
  lastUpdated:  string
}

export interface PortfolioStock {
  symbol:        string
  name:          string
  exchange:      string
  units:         number
  buyPrice:      number
  currentPrice:  number
  investedAmount: number
  currentValue:  number
  pnl:           number
  pnlPct:        number
  category:      string
}

// ── Fetch single stock quote from Yahoo Finance ────────────────────────────
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    // Add .NS for NSE if no exchange suffix
    const ticker = symbol.includes('.') ? symbol : `${symbol}.NS`
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    })
    if (!res.ok) return null

    const data = await res.json()
    const meta  = data?.chart?.result?.[0]?.meta
    if (!meta) return null

    return {
      symbol:      ticker,
      name:        meta.longName ?? meta.shortName ?? symbol,
      price:       meta.regularMarketPrice ?? 0,
      change:      (meta.regularMarketPrice ?? 0) - (meta.chartPreviousClose ?? 0),
      changePct:   meta.chartPreviousClose
        ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
        : 0,
      prevClose:   meta.chartPreviousClose ?? 0,
      marketCap:   meta.marketCap ?? 0,
      peRatio:     meta.trailingPE ?? 0,
      exchange:    meta.exchangeName ?? 'NSE',
      currency:    meta.currency ?? 'INR',
      lastUpdated: new Date().toISOString(),
    }
  } catch { return null }
}

// ── Fetch multiple stocks at once ──────────────────────────────────────────
export async function getMultipleQuotes(
  symbols: string[]
): Promise<Record<string, StockQuote>> {
  const results: Record<string, StockQuote> = {}

  // Yahoo Finance v7 supports comma-separated symbols
  try {
    const tickers = symbols.map(s => s.includes('.') ? s : `${s}.NS`).join(',')
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers}`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      cache: 'no-store',
    })

    if (res.ok) {
      const data = await res.json()
      for (const q of data?.quoteResponse?.result ?? []) {
        results[q.symbol] = {
          symbol:      q.symbol,
          name:        q.longName ?? q.shortName ?? q.symbol,
          price:       q.regularMarketPrice ?? 0,
          change:      q.regularMarketChange ?? 0,
          changePct:   q.regularMarketChangePercent ?? 0,
          prevClose:   q.regularMarketPreviousClose ?? 0,
          marketCap:   q.marketCap ?? 0,
          peRatio:     q.trailingPE ?? 0,
          exchange:    q.exchange ?? 'NSE',
          currency:    q.currency ?? 'INR',
          lastUpdated: new Date().toISOString(),
        }
      }
    }
  } catch {}

  return results
}

// ── Get NIFTY 50 index data ────────────────────────────────────────────────
export async function getNiftyData(): Promise<{
  nifty50: number
  niftyChange: number
  niftyChangePct: number
  sensex: number
  niftyMidcap: number
} | null> {
  try {
    const quotes = await getMultipleQuotes(['^NSEI', '^BSESN', '^NSEMDCP50'])
    const nifty  = quotes['^NSEI']
    const sensex = quotes['^BSESN']
    const mid    = quotes['^NSEMDCP50']

    if (!nifty) return null
    return {
      nifty50:        nifty.price,
      niftyChange:    nifty.change,
      niftyChangePct: nifty.changePct,
      sensex:         sensex?.price ?? 0,
      niftyMidcap:    mid?.price ?? 0,
    }
  } catch { return null }
}

// ── Enrich user portfolio with live prices ─────────────────────────────────
export async function enrichPortfolioWithLivePrices(
  stocks: Array<{ symbol: string; units: number; buyPrice: number; name?: string }>
): Promise<PortfolioStock[]> {
  if (!stocks.length) return []

  const symbols = stocks.map(s => s.symbol)
  const quotes  = await getMultipleQuotes(symbols)

  return stocks.map(stock => {
    const quote        = quotes[stock.symbol] ?? quotes[`${stock.symbol}.NS`]
    const currentPrice = quote?.price ?? stock.buyPrice
    const invested     = stock.units * stock.buyPrice
    const current      = stock.units * currentPrice
    const pnl          = current - invested
    const pnlPct       = invested > 0 ? (pnl / invested) * 100 : 0

    return {
      symbol:         stock.symbol,
      name:           quote?.name ?? stock.name ?? stock.symbol,
      exchange:       quote?.exchange ?? 'NSE',
      units:          stock.units,
      buyPrice:       stock.buyPrice,
      currentPrice,
      investedAmount: Math.round(invested),
      currentValue:   Math.round(current),
      pnl:            Math.round(pnl),
      pnlPct:         Math.round(pnlPct * 100) / 100,
      category:       inferCategory(stock.symbol, quote?.name ?? ''),
    }
  })
}

// ── Infer stock category ───────────────────────────────────────────────────
function inferCategory(symbol: string, name: string): string {
  const n = name.toLowerCase()
  const s = symbol.toLowerCase()

  if (s.includes('etf') || s.includes('bees') || n.includes('etf') || n.includes('index fund')) return 'Index ETF'
  if (n.includes('bank') || n.includes('finance') || n.includes('nbfc')) return 'Banking & Finance'
  if (n.includes('infra') || n.includes('cement') || n.includes('steel') || n.includes('power')) return 'Infrastructure'
  if (n.includes('pharma') || n.includes('health') || n.includes('hospital')) return 'Healthcare'
  if (n.includes('tech') || n.includes('software') || n.includes('infosy') || n.includes('wipro') || n.includes('tcs')) return 'Technology'
  if (n.includes('reliance') || n.includes('oil') || n.includes('gas') || n.includes('energy')) return 'Energy'
  if (n.includes('auto') || n.includes('motor') || n.includes('maruti')) return 'Automobiles'
  if (n.includes('fmcg') || n.includes('consumer') || n.includes('itc') || n.includes('hul') || n.includes('nestle')) return 'FMCG'

  // Size-based guess from Nifty lists
  const nifty50 = ['reliance', 'tcs', 'hdfc', 'infosys', 'icici', 'kotak', 'lt', 'sbi', 'bajaj', 'titan', 'asian', 'hul', 'maruti', 'wipro', 'hcl', 'nestle', 'ultratech', 'axis', 'powergrid', 'ntpc']
  if (nifty50.some(x => n.includes(x) || s.includes(x))) return 'Large Cap'
  return 'Mid Cap'
}

// ── Historical data for XIRR calculation ──────────────────────────────────
export async function getHistoricalPrices(
  symbol: string,
  fromDate: string  // YYYY-MM-DD
): Promise<Array<{ date: string; close: number }>> {
  try {
    const ticker   = symbol.includes('.') ? symbol : `${symbol}.NS`
    const from     = Math.floor(new Date(fromDate).getTime() / 1000)
    const to       = Math.floor(Date.now() / 1000)
    const url      = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${from}&period2=${to}&interval=1mo`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    })
    if (!res.ok) return []

    const data       = await res.json()
    const result     = data?.chart?.result?.[0]
    const timestamps = result?.timestamp ?? []
    const closes     = result?.indicators?.quote?.[0]?.close ?? []

    return timestamps.map((ts: number, i: number) => ({
      date:  new Date(ts * 1000).toISOString().split('T')[0],
      close: closes[i] ?? 0,
    })).filter((d: { date: string; close: number }) => d.close > 0)
  } catch { return [] }
}

// ── Popular Indian stocks for demo/autocomplete ────────────────────────────
export const POPULAR_NSE_STOCKS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'TCS.NS',      name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'INFY.NS',     name: 'Infosys' },
  { symbol: 'ICICIBANK.NS',name: 'ICICI Bank' },
  { symbol: 'KOTAKBANK.NS',name: 'Kotak Mahindra Bank' },
  { symbol: 'LT.NS',       name: 'Larsen & Toubro' },
  { symbol: 'SBIN.NS',     name: 'State Bank of India' },
  { symbol: 'BAJFINANCE.NS',name: 'Bajaj Finance' },
  { symbol: 'TITAN.NS',    name: 'Titan Company' },
  { symbol: 'WIPRO.NS',    name: 'Wipro' },
  { symbol: 'HCLTECH.NS',  name: 'HCL Technologies' },
  { symbol: 'MARUTI.NS',   name: 'Maruti Suzuki' },
  { symbol: 'ASIANPAINT.NS',name:'Asian Paints' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank' },
  { symbol: 'NIFTYBEES.NS',name: 'Nippon Nifty BeES ETF' },
  { symbol: 'JUNIORBEES.NS',name:'Nippon Junior BeES ETF' },
]