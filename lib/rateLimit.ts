/**
 * Simple in-memory rate limiter
 * Resets on server restart — use Redis for production
 */

interface RateEntry { count: number; resetAt: number }
const store = new Map<string, RateEntry>()

export interface RateLimitConfig {
  windowMs:  number   // time window in ms
  maxRequests: number // max requests per window
}

const DEFAULTS: Record<string, RateLimitConfig> = {
  agent:   { windowMs: 60_000, maxRequests: 10  }, // 10 agent runs/min
  api:     { windowMs: 60_000, maxRequests: 60  }, // 60 general requests/min
  auth:    { windowMs: 60_000, maxRequests: 5   }, // 5 login attempts/min
  export:  { windowMs: 60_000, maxRequests: 5   }, // 5 exports/min
}

export function checkRateLimit(
  identifier: string,
  tier: keyof typeof DEFAULTS = 'api'
): { allowed: boolean; remaining: number; resetIn: number } {
  const config = DEFAULTS[tier]
  const key    = `${tier}:${identifier}`
  const now    = Date.now()

  let entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs }
    store.set(key, entry)
  }

  entry.count++

  const remaining = Math.max(0, config.maxRequests - entry.count)
  const resetIn   = Math.ceil((entry.resetAt - now) / 1000)
  const allowed   = entry.count <= config.maxRequests

  // Clean up old entries periodically
  if (store.size > 10000) {
    store.forEach((v, k) => {
  if (now > v.resetAt) store.delete(k)
})
  }

  return { allowed, remaining, resetIn }
}

// Helper to add rate limit headers to response
export function rateLimitHeaders(remaining: number, resetIn: number): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset-In':  String(resetIn),
  }
}