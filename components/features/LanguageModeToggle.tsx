'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
import { Globe, Brain } from 'lucide-react'

export type Language = 'en' | 'hi' | 'mr'
export type Mode = 'expert' | 'simple'

interface PreferencesCtx {
  language: Language
  mode: Mode
  setLanguage: (l: Language) => void
  setMode: (m: Mode) => void
}

const Ctx = createContext<PreferencesCtx>({
  language: 'en', mode: 'expert',
  setLanguage: () => {}, setMode: () => {},
})

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')
  const [mode, setMode] = useState<Mode>('expert')
  return (
    <Ctx.Provider value={{ language, mode, setLanguage, setMode }}>
      {children}
    </Ctx.Provider>
  )
}

export function usePreferences() { return useContext(Ctx) }

const LANGS: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी',   flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी',   flag: '🇮🇳' },
]

export default function LanguageModeToggle() {
  const { language, mode, setLanguage, setMode } = usePreferences()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors">
        <Globe className="w-3.5 h-3.5" />
        {LANGS.find(l => l.code === language)?.flag} {language.toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 glass-card rounded-xl py-2 shadow-xl z-50">
          <div className="px-3 py-1.5 border-b border-border mb-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Language</div>
          </div>
          {LANGS.map(l => (
            <button key={l.code}
              onClick={() => { setLanguage(l.code); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left
                ${language === l.code ? 'text-primary font-medium' : 'text-foreground'}`}>
              <span>{l.flag}</span> {l.label}
              {language === l.code && <span className="ml-auto text-primary">✓</span>}
            </button>
          ))}

          <div className="px-3 py-1.5 border-t border-border mt-1 mb-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mode</div>
          </div>
          {(['expert', 'simple'] as Mode[]).map(m => (
            <button key={m}
              onClick={() => { setMode(m); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left
                ${mode === m ? 'text-primary font-medium' : 'text-foreground'}`}>
              <Brain className="w-3.5 h-3.5" />
              {m === 'expert' ? '🎓 Expert Mode' : '😊 Simple Mode (ELI5)'}
              {mode === m && <span className="ml-auto text-primary">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}