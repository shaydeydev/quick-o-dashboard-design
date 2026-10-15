import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const NEBIUS_BASE_URL = 'https://api.tokenfactory.nebius.com/v1'
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search'

const NEMOTRON_MODELS = [
  process.env.NEBIUS_MODEL,
  'nvidia/Nemotron-4-340B-Instruct',
  'nvidia/Llama-3.1-Nemotron-70B-Instruct-HF',
  'nvidia/nemotron-3-super-120b-a12b',
].filter((id): id is string => Boolean(id))

const SYSTEM_PROMPT = `You are QuickO, an autonomous AI commerce and subscription agent.
Help the user find the best live prices, compare merchants, surface subscription deals, and protect their budget.

Always use the tavily_search tool before recommending a purchase, merchant, or subscription change so prices and deals are current.

When you are done researching, respond with ONLY valid JSON (no markdown) matching this schema:
{
  "summary": "short chat-ready reply for the QuickO dashboard",
  "recommendations": [
    {
      "id": "string",
      "title": "string",
      "rationale": "string",
      "confidence": 0.0,
      "merchant": "string or null",
      "price": 0,
      "currency": "USD"
    }
  ],
  "priceComparisons": [
    {
      "product": "string",
      "merchants": [
        { "name": "string", "price": 0, "currency": "USD", "url": "string", "isBest": false }
      ],
      "savings": 0,
      "savingsPercent": 0,
      "bestMerchant": "string"
    }
  ],
  "actionItems": [
    {
      "id": "string",
      "label": "string",
      "type": "checkout" | "pause" | "resume" | "reorder" | "compare" | "review",
      "priority": "high" | "medium" | "low",
      "payload": {}
    }
  ],
  "sources": [{ "title": "string", "url": "string" }]
}

Rules:
- Prefer cheaper, reputable merchants. Call out savings clearly.
- Never invent checkout confirmation. Recommend actions; do not claim money was spent.
- If search results are thin, say so in summary and lower confidence.
- Prices must be numbers (USD unless evidence says otherwise).`

const TAVILY_TOOL = {
  type: 'function' as const,
  function: {
    name: 'tavily_search',
    description:
      'Search the live web for current product prices, merchant listings, coupon/subscription deals, and comparisons.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query, e.g. "Sony WH-1000XM5 best price Walmart Amazon".',
        },
        topic: {
          type: 'string',
          enum: ['general', 'news', 'finance'],
          description: 'Tavily topic. Use finance for pricing and deals when relevant.',
        },
      },
      required: ['query'],
    },
  },
}

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

type ToolCall = {
  id: string
  type?: string
  function: { name: string; arguments: string }
}

type AgentRequestBody = {
  query?: unknown
  message?: unknown
  context?: unknown
}

export type AgentRecommendation = {
  id: string
  title: string
  rationale: string
  confidence: number
  merchant: string | null
  price: number | null
  currency: string
}

export type PriceComparison = {
  product: string
  merchants: Array<{
    name: string
    price: number | null
    currency: string
    url: string | null
    isBest: boolean
  }>
  savings: number
  savingsPercent: number
  bestMerchant: string | null
}

export type AgentActionItem = {
  id: string
  label: string
  type: 'checkout' | 'pause' | 'resume' | 'reorder' | 'compare' | 'review'
  priority: 'high' | 'medium' | 'low'
  payload: Record<string, unknown>
}

export type AgentResponse = {
  ok: true
  summary: string
  recommendations: AgentRecommendation[]
  priceComparisons: PriceComparison[]
  actionItems: AgentActionItem[]
  sources: Array<{ title: string; url: string }>
  model: string
}

export async function POST(request: Request) {
  const nebiusKey = process.env.NEBIUS_API_KEY
  const tavilyKey = process.env.TAVILY_API_KEY

  if (!nebiusKey || !tavilyKey) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Missing NEBIUS_API_KEY or TAVILY_API_KEY in the server environment.',
      },
      { status: 500 },
    )
  }

  let body: AgentRequestBody
  try {
    body = (await request.json()) as AgentRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Request body must be JSON.' }, { status: 400 })
  }

  const query = normalizeQuery(body.query ?? body.message)
  if (!query) {
    return NextResponse.json(
      { ok: false, error: 'Provide a non-empty "query" (or "message") string.' },
      { status: 400 },
    )
  }

  const userContent = formatUserMessage(query, body.context)
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ]

  try {
    const { payload, model } = await runAgent(messages, nebiusKey, tavilyKey)
    const response: AgentResponse = { ok: true, ...payload, model }
    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent request failed.'
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}

function normalizeQuery(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function formatUserMessage(query: string, context: unknown) {
  if (context === undefined || context === null) {
    return query
  }

  return `${query}

Dashboard context (JSON):
${JSON.stringify(context)}`
}

async function runAgent(messages: ChatMessage[], nebiusKey: string, tavilyKey: string) {
  let lastModelError = ''

  for (const model of NEMOTRON_MODELS) {
    try {
      const payload = await completeWithTools(messages, model, nebiusKey, tavilyKey)
      return { payload, model }
    } catch (error) {
      lastModelError = error instanceof Error ? error.message : String(error)
      if (!isModelUnavailable(lastModelError)) {
        throw error
      }
    }
  }

  throw new Error(
    lastModelError ||
      'No NVIDIA Nemotron model was available on Nebius Token Factory. Set NEBIUS_MODEL to a valid model id.',
  )
}

function isModelUnavailable(message: string) {
  return /model|not found|does not exist|404|invalid_model|unknown model/i.test(message)
}

async function completeWithTools(
  seedMessages: ChatMessage[],
  model: string,
  nebiusKey: string,
  tavilyKey: string,
) {
  const messages = seedMessages.map((m) => ({ ...m }))
  let toolsEnabled = true

  for (let step = 0; step < 6; step++) {
    let completion: ChatCompletion
    try {
      completion = await createChatCompletion({
        apiKey: nebiusKey,
        model,
        messages,
        tools: toolsEnabled ? [TAVILY_TOOL] : undefined,
        toolChoice: toolsEnabled ? 'auto' : undefined,
        jsonMode: !toolsEnabled,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (toolsEnabled && /tool|function.?call|unsupported/i.test(message)) {
        toolsEnabled = false
        const fallback = await tavilySearch(tavilyKey, extractSearchQuery(messages), 'general')
        messages.push({
          role: 'user',
          content: `Live Tavily search results (tool calling unavailable on this model):\n${fallback}`,
        })
        continue
      }
      throw error
    }

    const choice = completion.choices?.[0]
    const assistant = choice?.message
    if (!assistant) {
      throw new Error('Nebius returned an empty completion.')
    }

    const toolCalls = assistant.tool_calls?.filter((call) => call.function?.name) ?? []
    if (toolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: assistant.content ?? null,
        tool_calls: toolCalls,
      })

      for (const call of toolCalls) {
        const args = parseToolArgs(call.function.arguments)
        const result =
          call.function.name === 'tavily_search'
            ? await tavilySearch(tavilyKey, String(args.query ?? ''), String(args.topic ?? 'general'))
            : JSON.stringify({ error: `Unknown tool: ${call.function.name}` })

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: result,
        })
      }
      continue
    }

    const parsed = parseAgentPayload(assistant.content ?? '')
    if (parsed) return parsed

    messages.push({
      role: 'assistant',
      content: assistant.content ?? '',
    })
    messages.push({
      role: 'user',
      content:
        'Convert your last answer into the required JSON schema only. No markdown, no commentary.',
    })
    toolsEnabled = false
  }

  throw new Error('QuickO agent did not return structured JSON after researching.')
}

type ChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string | null
      tool_calls?: ToolCall[]
    }
    finish_reason?: string
  }>
  error?: { message?: string }
}

async function createChatCompletion(options: {
  apiKey: string
  model: string
  messages: ChatMessage[]
  tools?: typeof TAVILY_TOOL[]
  toolChoice?: 'auto'
  jsonMode?: boolean
}) {
  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature: 0.2,
  }

  if (options.tools?.length) {
    body.tools = options.tools
    body.tool_choice = options.toolChoice ?? 'auto'
  } else if (options.jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(`${NEBIUS_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = (await response.json().catch(() => ({}))) as ChatCompletion & {
    error?: { message?: string } | string
    message?: string
  }

  if (!response.ok) {
    const detail =
      typeof data.error === 'string'
        ? data.error
        : data.error?.message || data.message || `HTTP ${response.status}`
    throw new Error(`Nebius Token Factory error: ${detail}`)
  }

  return data
}

function parseToolArgs(raw: string | undefined) {
  if (!raw) return {} as Record<string, unknown>
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return { query: raw }
  }
}

function extractSearchQuery(messages: ChatMessage[]) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user' && m.content)
  const text = lastUser?.content ?? ''
  return text.split('\n')[0]?.slice(0, 240) || 'current merchant prices and subscription deals'
}

async function tavilySearch(apiKey: string, query: string, topic: string) {
  const q = query.trim()
  if (!q) {
    return JSON.stringify({ error: 'tavily_search requires a query.' })
  }

  const allowedTopic = topic === 'news' || topic === 'finance' ? topic : 'general'

  const response = await fetch(TAVILY_SEARCH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: q,
      topic: allowedTopic,
      search_depth: 'advanced',
      max_results: 6,
      include_answer: true,
      include_raw_content: false,
    }),
  })

  const data = (await response.json().catch(() => ({}))) as {
    answer?: string
    results?: Array<{ title?: string; url?: string; content?: string; score?: number }>
    error?: string
    detail?: { error?: string }
  }

  if (!response.ok) {
    return JSON.stringify({
      error: data.error || data.detail?.error || `Tavily HTTP ${response.status}`,
    })
  }

  return JSON.stringify({
    answer: data.answer ?? null,
    results: (data.results ?? []).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      content: (r.content ?? '').slice(0, 800),
      score: r.score ?? null,
    })),
  })
}

function parseAgentPayload(raw: string) {
  const json = extractJson(raw)
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null
  const obj = json as Record<string, unknown>

  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : ''
  if (!summary) return null

  return {
    summary,
    recommendations: Array.isArray(obj.recommendations)
      ? obj.recommendations.map(normalizeRecommendation)
      : [],
    priceComparisons: Array.isArray(obj.priceComparisons)
      ? obj.priceComparisons.map(normalizeComparison)
      : [],
    actionItems: Array.isArray(obj.actionItems) ? obj.actionItems.map(normalizeAction) : [],
    sources: Array.isArray(obj.sources)
      ? obj.sources
          .map((s) => {
            if (!s || typeof s !== 'object') return null
            const item = s as Record<string, unknown>
            const title = typeof item.title === 'string' ? item.title : ''
            const url = typeof item.url === 'string' ? item.url : ''
            if (!title && !url) return null
            return { title: title || url, url }
          })
          .filter((s): s is { title: string; url: string } => Boolean(s))
      : [],
  }
}

function extractJson(raw: string) {
  const trimmed = raw.trim()
  const candidates = [trimmed]
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) candidates.unshift(fenced[1].trim())

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    candidates.push(trimmed.slice(start, end + 1))
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown
    } catch {
      continue
    }
  }
  return null
}

function normalizeRecommendation(value: unknown, index: number): AgentRecommendation {
  const item = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    id: stringOr(item.id, `rec-${index + 1}`),
    title: stringOr(item.title, 'Recommendation'),
    rationale: stringOr(item.rationale, ''),
    confidence: clampNumber(item.confidence, 0, 1, 0.5),
    merchant: typeof item.merchant === 'string' ? item.merchant : null,
    price: numberOrNull(item.price),
    currency: stringOr(item.currency, 'USD'),
  }
}

function normalizeComparison(value: unknown, index: number): PriceComparison {
  const item = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const merchants = Array.isArray(item.merchants)
    ? item.merchants.map((m) => {
        const merchant = m && typeof m === 'object' ? (m as Record<string, unknown>) : {}
        return {
          name: stringOr(merchant.name, 'Merchant'),
          price: numberOrNull(merchant.price),
          currency: stringOr(merchant.currency, 'USD'),
          url: typeof merchant.url === 'string' ? merchant.url : null,
          isBest: Boolean(merchant.isBest),
        }
      })
    : []

  if (merchants.length && !merchants.some((m) => m.isBest)) {
    const priced = merchants.filter((m) => m.price != null)
    const best = priced.reduce<(typeof merchants)[number] | null>(
      (acc, m) => (acc == null || (m.price ?? Infinity) < (acc.price ?? Infinity) ? m : acc),
      null,
    )
    if (best) best.isBest = true
  }

  const best = merchants.find((m) => m.isBest) ?? null
  return {
    product: stringOr(item.product, `Product ${index + 1}`),
    merchants,
    savings: numberOr(item.savings, 0),
    savingsPercent: numberOr(item.savingsPercent, 0),
    bestMerchant: typeof item.bestMerchant === 'string' ? item.bestMerchant : best?.name ?? null,
  }
}

function normalizeAction(value: unknown, index: number): AgentActionItem {
  const item = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const types = ['checkout', 'pause', 'resume', 'reorder', 'compare', 'review'] as const
  const priorities = ['high', 'medium', 'low'] as const
  const type = types.includes(item.type as (typeof types)[number])
    ? (item.type as (typeof types)[number])
    : 'review'
  const priority = priorities.includes(item.priority as (typeof priorities)[number])
    ? (item.priority as (typeof priorities)[number])
    : 'medium'

  return {
    id: stringOr(item.id, `action-${index + 1}`),
    label: stringOr(item.label, 'Review recommendation'),
    type,
    priority,
    payload:
      item.payload && typeof item.payload === 'object' && !Array.isArray(item.payload)
        ? (item.payload as Record<string, unknown>)
        : {},
  }
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberOr(value: unknown, fallback: number) {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) ? n : fallback
}

function numberOrNull(value: unknown) {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) ? n : null
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const n = numberOr(value, fallback)
  return Math.min(max, Math.max(min, n))
}
