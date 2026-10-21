'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Loader2, Mic, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProductCheckout } from './product-checkout'
import { getCheckoutItem, setCheckoutItem, type CheckoutItem } from '@/lib/checkout-store'
import { getSubscriptions, setPaused } from '@/lib/subscriptions-store'

const suggestions = [
  'Pause Spotify',
  'Find cheaper RTX card',
  'Which subscription should I cut?',
  'Protect my Prime and Spotify',
]

const PAYPAL_BALANCE = 30

const baseContext = {
  paypalBalance: PAYPAL_BALANCE,
  productInView: {
    name: 'GeForce RTX 4060 Ti',
    merchants: { Amazon: 449, Newegg: 399 } as Record<string, number>,
  },
}

// Use the product the user is actually looking at, and the real subscription state
function buildContext() {
  const last = getCheckoutItem()
  const subs = getSubscriptions()
  return {
    ...baseContext,
    productInView: last
      ? { name: last.title, merchants: { [last.merchant]: last.price } }
      : baseContext.productInView,
    subscriptions: subs.items.map((s, i) => ({
      name: s.name,
      price: s.price,
      priority: i + 1,
      paused: !!subs.paused[s.id],
    })),
  }
}

// Which subscriptions does the command talk about?
function findSubscriptions(cmd: string) {
  const subs = getSubscriptions().items
  if (/\b(all|everything|every)\b/.test(cmd)) return subs
  return subs.filter((s) => {
    const name = s.name.toLowerCase()
    if (cmd.includes(s.id) || cmd.includes(name)) return true
    return name.split(/\s+/).some((w) => w.length > 3 && new RegExp('\\b' + w + '\\b').test(cmd))
  })
}

function activeTotal() {
  const { items, paused } = getSubscriptions()
  return items.filter((s) => !paused[s.id]).reduce((sum, s) => sum + s.price, 0)
}

// Real pause / resume. Returns the reply text, or null if this is not a pause/resume command.
function handleSubscriptionCommand(cmd: string): string | null {
  // Questions go to the AI, they do not change anything
  if (cmd.includes('?') || /^(should|can|could|would|what|which|why|how|is|do|does|will)\b/.test(cmd)) {
    return null
  }
  const wantsResume = /\b(resume|unpause|reactivate|restart)\b/.test(cmd)
  const wantsPause = /\bpause\b/.test(cmd)
  if (!wantsResume && !wantsPause) return null

  const all = getSubscriptions().items
  const matched = findSubscriptions(cmd)
  if (matched.length === 0) {
    return `Which subscription? You have ${all.map((s) => s.name).join(', ')}.`
  }

  const target = wantsResume // true = resume, false = pause
  const changed: string[] = []
  const already: string[] = []
  for (const s of matched) {
    const isPaused = !!getSubscriptions().paused[s.id]
    if (isPaused === !target) {
      already.push(s.name)
    } else {
      setPaused(s.id, !target)
      changed.push(s.name)
    }
  }

  const parts: string[] = []
  if (changed.length) parts.push(`${target ? 'Resumed' : 'Paused'} ${changed.join(' and ')}.`)
  if (already.length) parts.push(`${already.join(' and ')} ${already.length > 1 ? 'are' : 'is'} already ${target ? 'active' : 'paused'}.`)

  const total = activeTotal()
  parts.push(`Active subscriptions now $${total.toFixed(2)} of $${PAYPAL_BALANCE.toFixed(2)}.`)
  if (total > PAYPAL_BALANCE) {
    parts.push('That is over your PayPal balance. Consider pausing your lowest priority subscription.')
  }
  parts.push('(Demo: simulated, not linked to the real service.)')
  return parts.join(' ')
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
  checkout?: CheckoutItem
}

function nowLabel() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// Cheapest USD recommendation that has a real price
function pickFromRecommendations(recs: unknown[]): CheckoutItem | null {
  let best: CheckoutItem | null = null
  for (const rec of recs ?? []) {
    const r = rec as {
      title?: string
      merchant?: string | null
      price?: number | string | null
      currency?: string
    }
    const price = typeof r.price === 'string' ? parseFloat(r.price) : r.price
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) continue
    if (r.currency && r.currency.toUpperCase() !== 'USD') continue
    if (!best || price < best.price) {
      best = { title: r.title ?? 'Item', price, merchant: r.merchant ?? 'Online' }
    }
  }
  return best
}

// Use the agent's recommendations first; fall back to live Tavily results
async function findCheckoutItem(command: string, payload: AgentPayload): Promise<CheckoutItem | null> {
  const fromAgent = pickFromRecommendations(payload.recommendations)
  if (fromAgent) return fromAgent
  try {
    const res = await fetch('/api/tavily-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: command }),
    })
    const data = await res.json()
    const best = (data.offers ?? []).find((o: any) => typeof o.price === 'number' && o.price > 0)
    if (!best) return null
    return {
      title: String(best.title).slice(0, 80),
      price: best.price,
      merchant: best.merchant,
      url: best.url,
    }
  } catch {
    return null
  }
}

export function AgentPrompt() {
  const [mounted, setMounted] = useState(false)
  const [value, setValue] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  // Chat starts empty. Nothing is saved, so a page reload is a fresh chat.
  const [messages, setMessages] = useState<Message[]>([])
  const [busy, setBusy] = useState(false)

  const streamRef = useRef<HTMLOListElement>(null)
  const idRef = useRef(0)
  const requestRef = useRef(0)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const el = streamRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Stop the mic if the component goes away
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        // ignore
      }
    }
  }, [])

  if (!mounted) {
    return null
  }

  // Real voice-to-text using the browser SpeechRecognition API (Chrome, Edge, Safari)
  const handleMicClick = () => {
    // Tap again while listening = stop
    if (listening) {
      try {
        recognitionRef.current?.stop()
      } catch {
        // ignore
      }
      return
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setVoiceError('Voice input is not supported in this browser. Try Chrome or Edge, or type your command.')
      return
    }

    setVoiceError('')
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true // show words live while you talk
    rec.continuous = false // stop on its own after you pause
    rec.maxAlternatives = 1

    rec.onstart = () => setListening(true)

    rec.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setValue(transcript.trim())
    }

    rec.onerror = (event: any) => {
      const code = event?.error
      if (code === 'aborted') return
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setVoiceError('Microphone is blocked. Allow mic access for this site in your browser, then try again.')
      } else if (code === 'no-speech') {
        setVoiceError("Didn't hear anything. Tap the mic and try again.")
      } else if (code === 'audio-capture') {
        setVoiceError('No microphone found. Plug one in or check your system settings.')
      } else if (code === 'network') {
        setVoiceError('Voice service needs an internet connection. Check your network and try again.')
      } else {
        setVoiceError('Voice input failed. Try again or type your command.')
      }
    }

    rec.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch {
      setListening(false)
      setVoiceError('Could not start the microphone. Try again.')
    }
  }

  async function submit(commandOverride?: string) {
    const command = (commandOverride ?? value).trim()
    if (!command || busy) return

    // Stop the mic if it is still on
    try {
      recognitionRef.current?.stop()
    } catch {
      // ignore
    }
    setVoiceError('')

    const time = nowLabel()
    const userId = ++idRef.current
    const agentId = ++idRef.current
    const requestId = ++requestRef.current

    setValue('')
    setBusy(true)

    const lowerCmd = command.toLowerCase()

    // "Pause Spotify" / "resume Netflix": really change the subscriptions
    const subReply = handleSubscriptionCommand(lowerCmd)
    if (subReply) {
      setMessages((prev: Message[]) => [
        ...prev,
        { id: userId, role: 'user', text: command, time },
        { id: agentId, role: 'agent', text: subReply, time, pending: false },
      ])
      setBusy(false)
      return
    }

    // Intent matching
    const isOrderIntent = /\b(order|buy|purchase|check\s?out|checkout)\b/.test(lowerCmd)
    const refersToLast =
      /\b(it|that|this|them|those|one)\b/.test(lowerCmd) || lowerCmd.split(/\s+/).length <= 3
    const isPriceIntent = /\b(price|prices|cheap|cheaper|cheapest|compare|deal|deals|best|find|cost|lowest)\b/.test(lowerCmd)

    // "Order it" / "buy that": check out the last product compared or scanned
    if (isOrderIntent && refersToLast) {
      const last = getCheckoutItem()
      setMessages((prev: Message[]) => [
        ...prev,
        { id: userId, role: 'user', text: command, time },
        {
          id: agentId,
          role: 'agent',
          text: last
            ? `Ready for 1-Click PayPal Checkout: ${last.title} from ${last.merchant} at $${last.price.toFixed(2)}.`
            : "I don't have a product queued up yet. Ask me to compare prices for something, or scan an item, and I'll set up checkout.",
          time,
          pending: false,
          checkout: last ?? undefined,
        },
      ])
      setBusy(false)
      return
    }

    // General path: live agent, then attach a checkout for the cheapest real offer
    setMessages((prev: Message[]) => [
      ...prev,
      { id: userId, role: 'user', text: command, time },
      {
        id: agentId,
        role: 'agent',
        text: 'Searching live prices and deals...',
        time,
        pending: true,
      },
    ])

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: command, context: buildContext() }),
      })
      const data = (await res.json()) as AgentPayload | AgentError

      if (requestId !== requestRef.current) return

      if (!res.ok || !data || !('ok' in data) || data.ok !== true) {
        const errObj = data as AgentError
        const errorMsg = errObj?.error || `Request failed (${res.status})`
        setMessages((prev: Message[]) =>
          prev.map((m: Message) =>
            m.id === agentId ? { ...m, pending: false, text: errorMsg, error: errorMsg } : m,
          ),
        )
        return
      }

      let item: CheckoutItem | null = null
      if (isPriceIntent || isOrderIntent) {
        item = await findCheckoutItem(command, data)
        if (requestId !== requestRef.current) return
        if (item) setCheckoutItem(item)
      }

      setMessages((prev: Message[]) =>
        prev.map((m: Message) =>
          m.id === agentId
            ? { ...m, pending: false, text: data.summary, payload: data, checkout: item ?? undefined }
            : m,
        ),
      )
    } catch (err) {
      if (requestId !== requestRef.current) return
      const errorMsg = err instanceof Error ? err.message : 'Could not reach QuickO agent.'
      setMessages((prev: Message[]) =>
        prev.map((m: Message) => (m.id === agentId ? { ...m, pending: false, text: errorMsg, error: errorMsg } : m)),
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
        {messages.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border bg-secondary/30 px-4 py-6 text-center text-sm text-muted-foreground">
            Ask me to compare prices, find a deal, or look after your subscriptions. Tap a suggestion below to start.
          </li>
        )}
        {messages.length > 0 && (
          <li className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Today
          </li>
        )}
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

              {/* Dynamic checkout for whatever product was compared, scanned, or asked for */}
              {m.checkout && !m.pending && <ProductCheckout item={m.checkout} />}

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
          placeholder={busy ? 'QuickO is researching...' : listening ? 'Listening to voice prompt...' : 'Compare prices or manage your subscriptions...'}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
          autoComplete="off"
        />
        {(value.trim() && !listening) || busy ? (
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
            onClick={handleMicClick}
            aria-pressed={listening}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            className={cn(
              'relative flex size-10 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95',
              listening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gradient-to-br from-primary/90 to-glow text-primary-foreground glow-ring',
            )}
          >
            <Mic className="relative size-4" aria-hidden="true" />
          </button>
        )}
      </form>

      {/* Voice status and errors, read out by screen readers */}
      <p role="status" aria-live="polite" className="relative mt-2 min-h-4 text-[11px] text-muted-foreground">
        {voiceError || (listening ? 'Listening… speak now.' : '')}
      </p>

      <ul className="relative mt-2 flex flex-wrap gap-2" aria-label="Suggested commands">
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