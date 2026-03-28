import Link from 'next/link'
import {
  TrendingUp, Shield, Zap, Target, Brain, Users,
  ArrowRight, CheckCircle2, IndianRupee, BarChart3, Sparkles
} from 'lucide-react'

const features = [
  { icon: TrendingUp, title: 'FIRE Path Planner', desc: 'Get your personalized month-by-month roadmap to financial independence with exact SIP amounts.', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: Shield, title: 'Money Health Score', desc: 'Diagnose your financial health across 6 dimensions in under 5 minutes. Know exactly where you stand.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: IndianRupee, title: 'Tax Wizard', desc: 'Upload Form 16 and instantly see which tax regime saves more. Never miss a deduction again.', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: Brain, title: 'Life Event Advisor', desc: 'Got a bonus, inheritance or a baby coming? Get a complete financial strategy for every life moment.', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { icon: Users, title: "Couple's Planner", desc: "India's first AI joint financial planner. Optimize HRA, SIPs, and taxes across both incomes.", color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { icon: BarChart3, title: 'Portfolio X-Ray', desc: 'Upload your CAMS statement and get XIRR, fund overlap, expense drag, and rebalancing suggestions.', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
]

const stats = [
  { value: '14 Cr+', label: 'Demat accounts in India' },
  { value: '₹25,000+', label: 'Avg advisor cost/year' },
  { value: '95%', label: 'Indians lack a financial plan' },
  { value: '0', label: 'Cost to use Money Mentor' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background mesh-bg">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg">Money Mentor</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/register" className="btn-primary text-sm py-2 px-4">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-primary/20">
          <Zap className="w-3 h-3" />
          AI-Powered Financial Intelligence · Built for India                 
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6">
          Your AI Financial Advisor<br />
          <span className="gradient-text">Available 24/7 for Free</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          From FIRE planning to tax optimization — get the financial guidance that only HNIs could afford,
          now accessible to every Indian investor. No jargon. No fees. Just clarity.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="btn-primary text-base py-4 px-8">
            Start Your Financial Journey
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/login" className="btn-secondary text-base py-4 px-8">
            Sign In
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-2xl p-5">
              <div className="font-display text-3xl font-bold gradient-text">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl font-bold mb-4">
            Everything You Need to Build Wealth
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Six powerful AI tools that work together to give you a complete picture of your finances.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="feature-card group">
              <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`w-6 h-6 ${f.color}`} />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="glass-card rounded-3xl p-10 md:p-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-4xl font-bold mb-6">
                Financial Planning <span className="gradient-text">Democratized</span>
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                95% of Indians don't have a financial plan. Advisors charge ₹25,000+ per year and only serve HNIs.
                We built Money Mentor to change that — giving every Indian access to personalized, AI-powered financial guidance.
              </p>
              <div className="space-y-3">
                {[
                  'Personalized plans based on your exact numbers',
                  'Real Indian tax laws and investment instruments',
                  'No generic advice — specific, actionable steps',
                  'Your data stays private and secure',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5 border-l-4 border-l-emerald-500">
                <div className="text-xs text-muted-foreground mb-1">Money Mentor AI</div>
                <div className="text-sm font-medium">
                  "Based on your age, income, and goals — you need a ₹45,000/month SIP to retire at 45 with ₹8.2 Cr corpus. Here's your exact breakdown..."
                </div>
              </div>
              <div className="glass-card rounded-2xl p-5 border-l-4 border-l-amber-500">
                <div className="text-xs text-muted-foreground mb-1">Tax Alert</div>
                <div className="text-sm font-medium">
                  "You can save ₹18,720 in tax this year by investing ₹50,000 in NPS under 80CCD(1B). Old regime saves ₹12,480 more for you."
                </div>
              </div>
              <div className="glass-card rounded-2xl p-5 border-l-4 border-l-blue-500">
                <div className="text-xs text-muted-foreground mb-1">Portfolio Insight</div>
                <div className="text-sm font-medium">
                  "3 of your 6 funds hold identical stocks. Consolidating saves ₹4,200/year in expense ratios and reduces overlap risk."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="font-display text-4xl font-bold mb-4">
          Ready to Take Control of Your Money?
        </h2>
        <p className="text-muted-foreground mb-8">Join thousands of Indians building wealth with AI guidance.</p>
        <Link href="/register" className="btn-primary text-base py-4 px-10 inline-flex">
          Get Your Money Health Score — Free
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="font-display font-semibold text-sm">AI Money Mentor</span>
          </div>
          <p className="text-xs text-muted-foreground">
            For educational purposes only. Not SEBI-registered investment advice.
          </p>
        </div>
      </footer>
    </div>
  )
}
