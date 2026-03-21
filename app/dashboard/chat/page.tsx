'use client'
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react'
import { useAgent } from '@/hooks/useAgent'

interface Message { role: 'user' | 'assistant'; content: string }

const STARTERS = [
  'How much SIP do I need to retire at 45?',
  'Should I choose old or new tax regime?',
  'How to build a 6-month emergency fund?',
  'What to do with a ₹5L bonus?',
  'ELSS vs PPF — which is better?',
  'How much term insurance do I need?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: "Namaste! 👋 I'm your AI Money Mentor. I remember your past plans and financial profile to give you personalized advice. Ask me anything about investing, tax, retirement, or mutual funds!",
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(text?: string) {
    const content = text || input.trim()
    if (!content || loading) return
    const userMsg: Message = { role: 'user', content }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType: 'chat', message: content }),
      })
      const data = await res.json()
      // Chat returns plan.strategy as the reply
      const reply = data?.plan?.strategy ?? data?.summary ?? 'I could not generate a response. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">AI Money Mentor Chat</h1>
          <p className="text-muted-foreground text-sm">Memory-aware · Uses your financial profile</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Agent Online
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="chat-bubble-ai flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Thinking with memory context...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Sparkles className="w-3 h-3" /> Quick starts
          </div>
          <div className="flex flex-wrap gap-2">
            {STARTERS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="text-xs bg-secondary hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30 rounded-xl px-3 py-1.5 transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl p-3 flex items-end gap-2">
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask about SIPs, tax, retirement, mutual funds..."
          className="flex-1 bg-transparent resize-none text-sm outline-none placeholder:text-muted-foreground max-h-32 min-h-[40px] py-1.5 px-2" rows={1} />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors disabled:opacity-40">
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-center text-muted-foreground mt-2">Educational purposes only. Not SEBI-registered advice.</p>
    </div>
  )
}
