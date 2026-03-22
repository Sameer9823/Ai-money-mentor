import { NextRequest, NextResponse } from 'next/server'
import { runContinuousAgent } from '@/agents/continuousAgent'

// This route is called by Vercel Cron daily
// In vercel.json add:
// {
//   "crons": [{ "path": "/api/cron/daily", "schedule": "0 6 * * *" }]
// }

export async function GET(req: NextRequest) {
  // Security: only allow Vercel Cron or internal calls
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[Cron] Daily agent run starting...')
    const result = await runContinuousAgent()

    console.log(`[Cron] Completed: ${result.usersProcessed} users, ${result.alertsGenerated} alerts, ${result.duration}ms`)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[Cron] Failed:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Also allow manual trigger from admin
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { userId } = body

  const result = await runContinuousAgent(userId)
  return NextResponse.json({ success: true, ...result })
}