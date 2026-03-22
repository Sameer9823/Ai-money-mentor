'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
  const [language, setLanguageState] = useState<Language>('en')
  const [mode, setModeState] = useState<Mode>('expert')

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const l = localStorage.getItem('mm_language') as Language
      const m = localStorage.getItem('mm_mode') as Mode
      if (l) setLanguageState(l)
      if (m) setModeState(m)
    } catch {}
  }, [])

  function setLanguage(l: Language) {
    setLanguageState(l)
    try { localStorage.setItem('mm_language', l) } catch {}
  }

  function setMode(m: Mode) {
    setModeState(m)
    try { localStorage.setItem('mm_mode', m) } catch {}
  }

  return (
    <Ctx.Provider value={{ language, mode, setLanguage, setMode }}>
      {children}
    </Ctx.Provider>
  )
}

export function usePreferences() { return useContext(Ctx) }

const LANGS: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
]

export default function LanguageModeToggle() {
  const { language, mode, setLanguage, setMode } = usePreferences()
  const [open, setOpen] = useState(false)

  const currentLang = LANGS.find(l => l.code === language)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{currentLang?.flag}</span>
        <span>{language.toUpperCase()}</span>
        {mode === 'simple' && (
          <span className="bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full">ELI5</span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-52 glass-card rounded-xl py-2 shadow-xl z-50">
            <div className="px-3 py-1.5 border-b border-border mb-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Language</div>
            </div>
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => { setLanguage(l.code); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left
                  ${language === l.code ? 'text-primary font-medium' : 'text-foreground'}`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
                {language === l.code && <span className="ml-auto text-primary text-xs">✓</span>}
              </button>
            ))}

            <div className="px-3 py-1.5 border-t border-border mt-1 mb-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Output Mode</div>
            </div>
            {(['expert', 'simple'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left
                  ${mode === m ? 'text-primary font-medium' : 'text-foreground'}`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>{m === 'expert' ? 'Expert Mode' : 'Simple Mode (ELI5)'}</span>
                {mode === m && <span className="ml-auto text-primary text-xs">✓</span>}
              </button>
            ))}
            {mode === 'simple' && (
              <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border mt-1">
                AI outputs will be simplified to plain language on next run.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}