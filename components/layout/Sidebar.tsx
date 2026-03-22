'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, TrendingUp, Heart, IndianRupee,
  Zap, Users, BarChart3, MessageCircle, Sparkles,
  BarChart2, Shield, Clock, Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard',                   icon: LayoutDashboard, label: 'Dashboard'       },
  { href: '/dashboard/fire-planner',      icon: TrendingUp,      label: 'FIRE Planner'    },
  { href: '/dashboard/money-health',      icon: Heart,           label: 'Money Health'    },
  { href: '/dashboard/tax-wizard',        icon: IndianRupee,     label: 'Tax Wizard'      },
  { href: '/dashboard/life-event',        icon: Zap,             label: 'Life Events'     },
  { href: '/dashboard/couples-planner',   icon: Users,           label: "Couple's Plan"   },
  { href: '/dashboard/portfolio',         icon: BarChart3,       label: 'Portfolio X-Ray' },
  { href: '/dashboard/insights',          icon: BarChart2,       label: 'Insights'        },
  { href: '/dashboard/chat',              icon: MessageCircle,   label: 'AI Chat'         },
  { href: '/dashboard/privacy',           icon: Lock,            label: 'Privacy & Data'  },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card/50 py-6">
      <div className="px-4 mb-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-display font-bold block leading-none">Money Mentor</span>
            <span className="text-[10px] text-primary font-medium">Multi-Agent AI v3</span>
          </div>
        </Link>
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className={cn('nav-item', active && 'active')}>
              <Icon className="w-4 h-4 shrink-0" /> {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 mt-4">
        <div className="glass-card rounded-xl p-3 text-xs">
          <div className="flex items-center gap-1.5 text-primary font-semibold mb-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            9 Agents Active
          </div>
          <div className="text-muted-foreground text-[10px] leading-relaxed">
            Orchestrator · Data · Analysis · Planning · Risk · Execution · Memory · Action · Question
          </div>
        </div>
      </div>
    </aside>
  )
}