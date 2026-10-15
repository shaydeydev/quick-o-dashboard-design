'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Loader2, Mic, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const suggestions = ['Reorder coffee beans', 'Find cheaper AirPods', 'Pause Netflix']

const dashboardContext = {
  paypalBalance: 30,
  productInView: {
    name: 'Sony WH-1000XM5 Headphones',
    merchants: { Amazon: 348, Walmart: 329 },
  },
  subscriptions: [
    { name: 'Amazon Prime', price: 14, priority: 1, paused: false },
    { name: 'Spotify', price: 11, priority: 2, paused: false },
    { name: 'Netflix', price: 15, priority: 3, paused: true },
  ],
}

type AgentPayload = {
  ok: true
  summary: string
  recommendations: unknown[]
  priceComparisons: unknown[]
  actionItems: unknown[]
  sources: unknown[]
  model: string
}

type AgentError = { ok?: false; error?: string }

type Message = {
  id: number
  role: 'user' | 'agent'
  text: string
  time: string
  pending?: boolean
  payload?: AgentPayload
  error?: string
}

const history: Message[] = [
  { id: 1, role: 'user', text: 'Find me the best price on Sony XM5 headphones.', time: '9:41 AM' },
  {
    id: 2,
    role: 'agent',
    text: 'Scanned Amazon and Walmart. Walmart has them for $329, which is $19 less than Amazon. Ready for 1-Click PayPal Checkout.',
    time: '9:41 AM',
  },
  { id: 3, role: 'user', text: 'My PayPal is low. Protect my important subs.', time: '9:43 AM' },
  {
    id: 4,
    role: 'agent',
    text: 'Done. Netflix (Priority 3) is paused. Prime and Spotify stay active — $25.00 of your $30.00 balance is covered.',
    time: '9:43 AM',
  },
]

function nowLabel() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function AgentPrompt() {
  const [mounted, setMounted] = useState(false)
  const [value, setValue] = useState('')
  const [listening, setListening] = useState(false)
  const [messages, setMessages] = useState<Message[]>(history)
  const [busy, setBusy] = useState(false)
  const streamRef = useRef<HTMLOListElement>(null)
  const idRef = useRef(history.length)
  const requestRef = useRef(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const el = streamRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  if (!mounted) {
    return null
  }

  async function submit(commandOverride?: string) {
    const command = (commandOverride ?? value).trim()
    if (!command || busy) return

    const time = nowLabel()
    const userId = ++idRef.current
    const agentId = ++idRef.current
    const requestId = ++requestRef.current

    setValue('')
    setBusy(true)
    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', text: command, time },
      {
        id: agentId,
        role: 'agent',
        text: 'Searching live prices and deals…',
        time,
        pending: true,
      },
    ])

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: command, context: dashboardContext }),
      })
      const data = (await res.json()) as AgentPayload | AgentError

      if (requestId !== requestRef.current) return

      if (!res.ok || !data || !('ok' in data) || data.ok !== true) {
        const error = (data as AgentError).error || `Request failed (${res.status})`
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentId
              ? { ...m, pending: false, text: error, error }
              : m,
          ),
        )
        return
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentId
            ? { ...m, pending: false, text: data.summary, payload: data }
            : m,
        ),
      )
    } catch (err) {
      if (requestId !== requestRef.current) return
      const error = err instanceof Error ? err.message : 'Could not reach QuickO agent.'
      setMessages((prev) =>
        prev.map((m) => (m.id === agentId ? { ...m, pending: false, text: error, error } : m)),
      )
    } finally {
      if (requestId === requestRef.current) setBusy(false)
    }
  }

  return (
    <section aria-labelledby="agent-heading" className="glass relative overflow-hidden rounded-3xl p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-glow/25 blur-3xl"
      />
      <div className="relative flex items-center gap-2 text-xs font-medium text-primary">
        <Sparkles className="size-3.5" aria-hidden="true" />
        <span id="agent-heading">Ask your agent</span>
        {busy && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Live Nemotron + Tavily
          </span>
        )}
      </div>
      <p className="relative mt-2 text-pretty text-lg font-medium leading-snug">
        What should QuickO handle for you today?
      </p>

      <ol
        ref={streamRef}
        aria-label="Conversation history"
        aria-live="polite"
        className="relative mt-4 flex max-h-[28rem] flex-col gap-3 overflow-y-auto pr-1 [scrollbar-width:thin]"
      >
        <li className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Today
        </li>
        {messages.map((m) => (
          <li key={m.id} className={cn('flex flex-col gap-1', m.role === 'user' ? 'items-end' : 'items-start')}>
            {m.role === 'agent' && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
                <Sparkles className="size-3" aria-hidden="true" />
                QuickO
              </span>
            )}
            <div
              className={cn(
                'max-w-[92%] text-pretty rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'rounded-br-md bg-primary/90 text-primary-foreground'
                  : m.error
                    ? 'rounded-bl-md border border-warning/40 bg-warning/10 text-foreground'
                    : 'rounded-bl-md border border-border bg-secondary/60 text-foreground',
              )}
            >
              <span className="sr-only">{m.role === 'user' ? 'You: ' : 'QuickO: '}</span>
              <p className="flex items-start gap-2">
                {m.pending && (
                  <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-primary" aria-hidden="true" />
                )}
                <span>{m.text}</span>
              </p>
              {m.payload && <LiveAgentResult payload={m.payload} />}
            </div>
            <time className="px-1 text-[10px] text-muted-foreground">{m.time}</time>
          </li>
        ))}
      </ol>

      <form
        className={cn(
          'relative mt-4 flex items-center gap-2 rounded-2xl border bg-background/60 p-1.5 pl-4 transition-shadow',
          listening ? 'glow-ring border-primary/50' : 'border-input focus-within:border-primary/50 focus-within:glow-ring',
        )}
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <label htmlFor="agent-input" className="sr-only">
          Command for QuickO agent
        </label>
        <input
          id="agent-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
          }}
          placeholder={busy ? 'QuickO is researching…' : listening ? 'Listening…' : 'Order my usual or pause low-priority subs...'}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
          autoComplete="off"
        />
        {value.trim() || busy ? (
          <button
            type="submit"
            disabled={busy || !value.trim()}
            aria-label="Send command"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowUp className="size-4" aria-hidden="true" />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setListening((l) => !l)}
            aria-pressed={listening}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            className={cn(
              'relative flex size-10 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95',
              listening
                ? 'bg-primary text-primary-foreground'
                : 'bg-gradient-to-br from-primary/90 to-glow text-primary-foreground glow-ring',
            )}
          >
            {listening && (
              <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-xl bg-primary/40" />
            )}
            <Mic className="relative size-4" aria-hidden="true" />
          </button>
        )}
      </form>

      <ul className="relative mt-3 flex flex-wrap gap-2" aria-label="Suggested commands">
        {suggestions.map((s) => (
          <li key={s}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit(s)}
              className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function LiveAgentResult({ payload }: { payload: AgentPayload }) {
  const json = JSON.stringify(
    {
      ok: payload.ok,
      summary: payload.summary,
      recommendations: payload.recommendations,
      priceComparisons: payload.priceComparisons,
      actionItems: payload.actionItems,
      sources: payload.sources,
      model: payload.model,
    },
    null,
    2,
  )

  return (
    <div className="mt-3 flex flex-col gap-2">
      {payload.recommendations.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {payload.recommendations.map((rec, i) => {
            const r = rec as {
              id?: string
              title?: string
              rationale?: string
              merchant?: string | null
              price?: number | null
              currency?: string
            }
            return (
              <li key={r.id ?? `rec-${i}`} className="rounded-xl border border-border/80 bg-background/40 px-2.5 py-2">
                <p className="text-xs font-semibold">{r.title}</p>
                {r.rationale && <p className="mt-0.5 text-[11px] text-muted-foreground">{r.rationale}</p>}
                {(r.merchant || r.price != null) && (
                  <p className="mt-1 font-mono text-[11px] text-primary">
                    {[r.merchant, r.price != null ? `${r.currency ?? 'USD'} ${r.price}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {payload.actionItems.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {payload.actionItems.map((item, i) => {
            const a = item as { id?: string; label?: string; type?: string }
            return (
              <li
                key={a.id ?? `act-${i}`}
                className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary"
              >
                {a.label}
              </li>
            )
          })}
        </ul>
      )}

      <details className="rounded-xl border border-border/70 bg-background/50">
        <summary className="cursor-pointer px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Live JSON · {payload.model}
        </summary>
        <pre className="max-h-48 overflow-auto px-2.5 pb-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {json}
        </pre>
      </details>
    </div>
  )
}
