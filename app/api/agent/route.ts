import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { orchestrate } from '@/agents/orchestrator'
import { getAuditLog } from '@/lib/auditLogger'
import { TaskType } from '@/types/agents'
import { connectDB } from '@/lib/db'
import Report from '@/models/Report'
import { randomUUID } from 'crypto'

const VALID_TASKS: TaskType[] = [
  'fire_plan', 'money_health', 'tax_wizard',
  'life_event', 'couples_plan', 'portfolio_xray', 'chat'
]

const TASK_TITLES: Record<string, string> = {
  fire_plan: 'FIRE Path Plan',
  money_health: 'Money Health Analysis',
  tax_wizard: 'Tax Optimization Report',
  life_event: 'Life Event Strategy',
  couples_plan: "Couple's Financial Plan",
  portfolio_xray: 'Portfolio X-Ray Analysis',
  chat: 'AI Chat Session',
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { taskType, ...userInput } = body

    if (!taskType || !VALID_TASKS.includes(taskType)) {
      return NextResponse.json({ error: `Invalid taskType` }, { status: 400 })
    }

    if (userInput.goals && typeof userInput.goals === 'string') {
      userInput.goals = userInput.goals.split(',').map((g: string) => g.trim()).filter(Boolean)
    }

    const userId = session.user.id ?? session.user.email ?? 'anonymous'

    const result = await orchestrate({ taskType: taskType as TaskType, userId, userInput })

    // Save report to DB (non-blocking)
    if (taskType !== 'chat') {
      try {
        await connectDB()
        const reportId = randomUUID()
        await Report.create({
          reportId,
          userId,
          profileVersion: 1,
          type: taskType,
          title: `${TASK_TITLES[taskType] ?? taskType} - ${new Date().toLocaleDateString('en-IN')}`,
          inputs: userInput,
          outputs: { plan: result.plan, analysis: result.analysis, impactDashboard: result.impactDashboard },
          agentLogs: result.auditSummary ? [{
            agent: 'orchestrator',
            status: 'completed',
            durationMs: 0,
            timestamp: new Date().toISOString(),
          }] : [],
          metrics: {
            taxSaved: result.impactDashboard.taxSaved,
            retirementReadiness: result.impactDashboard.retirementReadiness,
            portfolioImprovement: result.impactDashboard.portfolioImprovement,
            netWorthGrowth: result.impactDashboard.netWorthGrowth,
          },
          pdfGenerated: false,
        })
      } catch (e) {
        console.error('Report save failed (non-critical):', e)
      }
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Agent pipeline failed'
    console.error('[Agent API Error]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const taskId = req.nextUrl.searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 })
  const log = getAuditLog(taskId)
  if (!log) return NextResponse.json({ error: 'Log not found' }, { status: 404 })
  return NextResponse.json(log)
}
