'use client'
import { useState, useEffect, Suspense } from 'react'
import { CheckCircle2, AlertTriangle, RefreshCw, Shield, BarChart3, TrendingUp, Plus, Trash2, Search } from 'lucide-react'
import { POPULAR_NSE_STOCKS } from '@/lib/yahooFinanceApi'

interface SavedStock { symbol: string; name: string; units: number; buyPrice: number }
interface PortfolioSummary {
  totalValue: number; totalInvested: number
  totalPnL: number; totalPnLPct: number; holdingCount: number; fetchedAt: string
}
interface LiveStock {
  symbol: string; name: string; currentPrice: number; currentValue: number
  investedAmount: number; pnl: number; pnlPct: number; category: string
}

function ConnectContent() {
  const [stocks, setStocks]       = useState<SavedStock[]>([])
  const [liveData, setLiveData]   = useState<LiveStock[]>([])
  const [summary, setSummary]     = useState<PortfolioSummary | null>(null)
  const [loading, setLoading]     = useState(true)
  const [syncing, setSyncing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [showAdd, setShowAdd]     = useState(false)
  const [search, setSearch]       = useState('')
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null)
  const [newStock, setNewStock]   = useState({ symbol: '', name: '', units: 0, buyPrice: 0 })

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => { loadPortfolio() }, [])

  async function loadPortfolio() {
    setLoading(true)
    try {
      const res = await fetch('/api/agent/broker/portfolio')
      const d   = await res.json()
      if (d.connected && d.portfolio) {
        setLiveData(d.portfolio.funds)
        setSummary(d.portfolio.summary)
        // Reconstruct saved stocks from live data for editing
      }
    } catch {}
    finally { setLoading(false) }
  }

  async function syncPrices() {
    setSyncing(true)
    await loadPortfolio()
    showToast('Live prices updated from Yahoo Finance!')
    setSyncing(false)
  }

  async function savePortfolio() {
    if (!stocks.length) return
    setSaving(true)
    try {
      const res = await fetch('/api/agent/broker/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stocks }),
      })
      if (res.ok) {
        showToast(`${stocks.length} stocks saved! Fetching live prices...`)
        await loadPortfolio()
        setShowAdd(false)
      }
    } catch { showToast('Save failed', false) }
    finally { setSaving(false) }
  }

  function addStock() {
    if (!newStock.symbol || !newStock.units || !newStock.buyPrice) return
    const sym = newStock.symbol.toUpperCase()
    const ticker = sym.includes('.') ? sym : `${sym}.NS`
    setStocks(prev => [...prev, { ...newStock, symbol: ticker }])
    setNewStock({ symbol: '', name: '', units: 0, buyPrice: 0 })
  }

  function selectPopular(s: { symbol: string; name: string }) {
    setNewStock(prev => ({ ...prev, symbol: s.symbol, name: s.name }))
    setSearch('')
  }

  const filtered = search.length > 1
    ? POPULAR_NSE_STOCKS.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.symbol.toLowerCase().includes(search.toLowerCase()))
    : []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2
          ${toast.ok ? 'bg-emerald-500 text-white' : 'bg-destructive text-white'}`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-blue-500"/>
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Live Portfolio Tracker</h1>
          <p className="text-muted-foreground text-sm">Real NSE/BSE prices via Yahoo Finance — Free, no API key needed</p>
        </div>
      </div>

      {/* How it works */}
      <div className="glass-card rounded-2xl p-4 bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-primary"/>
          <span className="font-semibold text-sm">Powered by Yahoo Finance API — 100% Free</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter your stock holdings once → AI autonomously fetches live NSE/BSE prices, calculates real P&amp;L,
          XIRR, and runs full portfolio X-Ray analysis. Updates every time you visit.
        </p>
      </div>

      {/* Live portfolio if loaded */}
      {summary && (
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500"/>
              <span className="font-display font-semibold">Your Live Portfolio</span>
              <span className="text-xs text-muted-foreground">
                · Updated {new Date(summary.fetchedAt).toLocaleTimeString('en-IN')}
              </span>
            </div>
            <button onClick={syncPrices} disabled={syncing}
              className="flex items-center gap-1.5 btn-secondary text-xs py-1.5 px-3 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`}/>
              {syncing ? 'Syncing...' : 'Sync Prices'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Current Value',  value: `₹${(summary.totalValue/100000).toFixed(2)}L`,  color: 'text-blue-500'    },
              { label: 'Invested',       value: `₹${(summary.totalInvested/100000).toFixed(2)}L`, color: 'text-foreground' },
              { label: 'Total P&L',      value: `${summary.totalPnL >= 0 ? '+' : ''}₹${Math.abs(summary.totalPnL).toLocaleString('en-IN')}`, color: summary.totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500' },
              { label: 'Returns',        value: `${summary.totalPnLPct >= 0 ? '+' : ''}${summary.totalPnLPct.toFixed(1)}%`, color: summary.totalPnLPct >= 0 ? 'text-emerald-500' : 'text-rose-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-secondary rounded-xl p-3 text-center">
                <div className={`font-display font-bold text-lg ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {liveData.map(s => (
              <div key={s.symbol} className="flex items-center justify-between p-2.5 bg-secondary rounded-xl text-sm">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.symbol} · {s.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">₹{s.currentPrice.toLocaleString('en-IN')}</div>
                  <div className={`text-xs font-medium ${s.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {s.pnl >= 0 ? '+' : ''}{s.pnlPct.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add holdings */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">
            {summary ? 'Update Holdings' : 'Add Your Holdings'}
          </h3>
          <button onClick={() => setShowAdd(v => !v)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
            <Plus className="w-3 h-3"/> Add Stock
          </button>
        </div>

        {showAdd && (
          <div className="mb-4 p-4 bg-secondary rounded-xl space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search NSE stocks (e.g. Reliance, TCS)..."
                className="input-field pl-8 text-sm"/>
              {filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filtered.map(s => (
                    <button key={s.symbol} onClick={() => selectPopular(s)}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-secondary transition-colors">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{s.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">NSE Symbol (e.g. RELIANCE.NS)</label>
                <input value={newStock.symbol} onChange={e => setNewStock(p => ({ ...p, symbol: e.target.value }))}
                  placeholder="RELIANCE.NS" className="input-field text-sm"/>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Stock Name</label>
                <input value={newStock.name} onChange={e => setNewStock(p => ({ ...p, name: e.target.value }))}
                  placeholder="Reliance Industries" className="input-field text-sm"/>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Units/Shares</label>
                <input type="number" value={newStock.units || ''}
                  onChange={e => setNewStock(p => ({ ...p, units: Number(e.target.value) }))}
                  placeholder="100" className="input-field text-sm"/>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Buy Price (₹)</label>
                <input type="number" value={newStock.buyPrice || ''}
                  onChange={e => setNewStock(p => ({ ...p, buyPrice: Number(e.target.value) }))}
                  placeholder="2400" className="input-field text-sm"/>
              </div>
            </div>
            <button onClick={addStock}
              disabled={!newStock.symbol || !newStock.units || !newStock.buyPrice}
              className="btn-primary text-sm disabled:opacity-50">
              + Add to List
            </button>
          </div>
        )}

        {stocks.length > 0 && (
          <div className="space-y-2 mb-4">
            {stocks.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-secondary rounded-xl text-sm">
                <div>
                  <span className="font-medium">{s.name || s.symbol}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{s.symbol}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">{s.units} @ ₹{s.buyPrice}</span>
                  <button onClick={() => setStocks(prev => prev.filter((_, j) => j !== i))}
                    className="text-destructive hover:text-destructive/80">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>
            ))}
            <button onClick={savePortfolio} disabled={saving}
              className="w-full btn-primary mt-2 disabled:opacity-50">
              {saving ? 'Saving & fetching live prices...' : `Save ${stocks.length} stocks & Get Live Prices`}
            </button>
          </div>
        )}

        {!stocks.length && !summary && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Add your NSE/BSE stock holdings to get real-time P&L and AI portfolio analysis.
          </div>
        )}
      </div>

      {/* Security note */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5"/>
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Privacy:</strong> Only your stock symbols and quantities are stored — never your broker credentials.
            Live prices are fetched from Yahoo Finance's public API. Your holdings data stays in your account and can be deleted anytime from Privacy settings.
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConnectBrokerPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground p-8">Loading...</div>}>
      <ConnectContent/>
    </Suspense>
  )
}