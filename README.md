# 🧠 AI Money Mentor v2 — Agentic System
### Multi-Agent Autonomous Financial Planning · ET AI Hackathon 2026

---

## 🏗 Architecture

```
User Request
     ↓
Orchestrator Agent (Brain)
     ↓
Memory Agent ──→ Load user history & behavioral patterns
     ↓
Data Agent ──→ Fetch AMFI NAV, parse PDFs, validate inputs
     ↓ (retry if data incomplete)
Analysis Agent ──→ XIRR, tax calc, overlap, FIRE metrics (NO LLM)
     ↓
Planning Agent ──→ Claude API: strategy, SIP plan, insights
     ↓ (retry if JSON invalid)
Risk Agent ──→ Guardrails: affordability, age-equity, compliance
     ↓ (re-run planning if plan rejected)
Execution Agent ──→ Final output, impact dashboard, checklist
     ↓
Memory Agent ──→ Save results, behavioral patterns
     ↓
Audit Log ──→ Every step tracked with timing & retry count
```

---

## 📁 Key Files

```
/agents
  orchestrator.ts    ← Controls entire pipeline, retries, branching
  dataAgent.ts       ← AMFI NAV, PDF parsing, field validation
  analysisAgent.ts   ← Deterministic math: XIRR, tax, overlap (no LLM)
  planningAgent.ts   ← Claude API with memory-adapted prompts
  riskAgent.ts       ← Guardrails: SIP affordability, age-equity, compliance
  executionAgent.ts  ← Assembles final output + impact dashboard
  memoryAgent.ts     ← MongoDB persistence + behavior adaptation

/tools
  financialTools.ts  ← getMutualFundNAV, calculateXIRR, taxCalculatorIndia,
                        portfolioOverlapAnalyzer, calculateSIPMaturity,
                        parsePDF, computeRiskScore

/lib
  auditLogger.ts     ← Tracks every agent step with timing
  db.ts / auth.ts

/hooks
  useAgent.ts        ← Single React hook for all agent tasks

/components/ui
  AgentPipeline.tsx  ← Live pipeline visualizer during execution
  ImpactDashboard.tsx← Tax saved, portfolio %, retirement readiness
```

---

## 🚀 Setup

```bash
npm install
cp .env.example .env.local   # fill in keys
npm install tailwindcss-animate   # required plugin
npm run dev
```

**Required .env.local keys:**
```
ANTHROPIC_API_KEY=sk-ant-...
MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=...    # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

---

## 🔑 How It Differs From v1

| Feature | v1 (Simple) | v2 (Agentic) |
|---|---|---|
| Architecture | Direct LLM calls | 7-agent orchestrated pipeline |
| Tax calculation | LLM | Deterministic engine (exact ₹) |
| XIRR | LLM | Newton-Raphson algorithm |
| Portfolio overlap | LLM | Deterministic analyzer |
| Memory | None | MongoDB with behavior tracking |
| Failure handling | None | Retry with backoff, fallback logic |
| Audit trail | None | Every step logged with timing |
| Compliance | Disclaimer text | Risk agent validates every plan |
| Impact dashboard | Static | Real computed metrics |
| Live pipeline UI | None | AgentPipeline component |

---

## 🛡 Guardrails (Risk Agent)

1. **SIP Affordability** — Caps SIP at 90% of surplus, adjusts down
2. **Age-Equity Rule** — Max equity = 100 - age (thumb rule)
3. **Illegal advice filter** — Removes non-compliant tax suggestions
4. **Insurance gate** — Adds term insurance as top priority if missing
5. **Debt guardrail** — Debt repayment prioritized over SIP if EMI > 50% income
6. **Emergency fund gate** — Flagged before investing if < 3 months
7. **SEBI disclaimer** — Always injected into explainability field

---

## 📊 Impact Model

| Metric | How Calculated |
|---|---|
| Tax Saved | `oldRegime.tax - newRegime.tax` (deterministic) |
| XIRR | Newton-Raphson on cashflows |
| Retirement Readiness | `projectedCorpus / neededCorpus × 100` |
| Expense Drag | Weighted average ER × portfolio value |
| Overlap Score | Category concentration + duplicate fund count |

---

## 🔁 Retry Logic

- **Data Agent**: 3 retries with 500ms backoff
- **Analysis Agent**: 3 retries with 300ms backoff  
- **Planning Agent**: 2 retries; JSON parse failure → re-prompt with simpler output
- **Risk rejection**: Re-runs Planning Agent with risk flags injected into prompt
- **Memory Agent**: Non-critical — failures logged but don't break pipeline

---

## 💬 Single API Endpoint

All features go through one route: `POST /api/agent`

```json
{ "taskType": "fire_plan", "age": 28, "monthlyIncome": 80000, ... }
{ "taskType": "tax_wizard", "basicSalary": 600000, ... }
{ "taskType": "portfolio_xray", "funds": [...] }
{ "taskType": "chat", "message": "How much SIP do I need?" }
```

Returns `ExecutionOutput` with: plan, analysis, impactDashboard, auditSummary.
