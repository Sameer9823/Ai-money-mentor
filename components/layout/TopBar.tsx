'use client'
import { signOut } from 'next-auth/react'
import { Bell, Sun, Moon, LogOut, User } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState } from 'react'

interface TopBarProps {
  user?: { name?: string | null; email?: string | null; image?: string | null }
}

export default function TopBar({ user }: TopBarProps) {
  const { theme, setTheme } = useTheme()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <header className="h-14 border-b border-border bg-card/50 px-6 flex items-center justify-between">
      <div className="font-display font-semibold text-sm text-muted-foreground">
        Welcome back, <span className="text-foreground">{user?.name?.split(' ')[0] ?? 'there'}</span> 👋
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 hover:bg-secondary rounded-lg px-2 py-1.5 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span className="text-sm font-medium hidden sm:block">{user?.name?.split(' ')[0]}</span>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 glass-card rounded-xl py-2 shadow-lg z-50">
              <div className="px-3 py-2 border-b border-border mb-1">
                <div className="text-sm font-medium">{user?.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
