'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Loader2, Search, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCheckoutItem } from '@/lib/checkout-store'
import { ProductCheckout } from './product-checkout'

const MERCHANTS = [
  { key: 'amazon', label: 'Amazon' },
  { key: 'ebay', label: 'eBay' },
  { key: 'target', label: 'Target' },
  { key: 'walmart', label: 'Walmart' },
  { key: 'bestbuy', label: 'Best Buy' },
]

type Candidate = { title: string; url: string; price: number | null }
type RowState = { status: 'idle' | 'loading' | 'done' | 'error'; candidates: Candidate[] }
type Rows = Record<string, RowState>

function makeRows(status: RowState['status']): Rows {
  const rows: Rows = {}
  for (const m of MERCHANTS) rows[m.key] = { status, candidates: [] }
  return rows
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#12141c]'

export function PriceMatch() {
  const checkoutItem = useCheckoutItem()
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState('')
  const [rows, setRows] = useState<Rows>(() => makeRows('idle'))

  const runRef = useRef(0)
  const lastAutoRef = useRef('')

  // Search all five merchants at the same time. Each row fills in when its answer lands.
  const compare = useCallback((raw: string) => {
    const q = raw.trim().slice(0, 200)
    if (!q) return
    const run = ++runRef.current
    setSearched(q)
    setRows(makeRows('loading'))

    MERCHANTS.forEach(async (m) => {
      try {
        const res = await fetch('/api/arbitrage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, merchant: m.key }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Search failed')
        if (run !== runRef.current) return
        setRows((prev) => ({
          ...prev,
          [m.key]: { status: 'done', candidates: data.candidates ?? [] },
        }))
      } catch {
        if (run !== runRef.current) return
        setRows((prev) => ({ ...prev, [m.key]: { status: 'error', candidates: [] } }))
      }
    })
  }, [])

  // When the scanner or chat picks a new product, compare it automatically
  useEffect(() => {
    const title = checkoutItem?.title
    if (title && title !== lastAutoRef.current) {
      lastAutoRef.current = title
      setQuery(title)
      compare(title)
    }
  }, [checkoutItem, compare])

  const view = useMemo(() => {
    // Throw out prices far from the middle (accessories, cases, bundles)
    const all: number[] = []
    for (const m of MERCHANTS) {
      for (const c of rows[m.key].candidates) if (c.price) all.push(c.price)
    }
    let lo = 0
    let hi = Infinity
    if (all.length >= 3) {
      const sorted = [...all].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]
      lo = median * 0.4
      hi = median * 2.5
    }

    const list = MERCHANTS.map((m) => {
      const row = rows[m.key]
      const ok = row.candidates.filter((c) => c.price !== null && c.price >= lo && c.price <= hi)
      const offer = ok.reduce<Candidate | null>(
        (acc, c) => (!acc || (c.price as number) < (acc.price as number) ? c : acc),
        null,
      )
      return {
        key: m.key,
        label: m.label,
        status: row.status,
        offer,
        link: offer?.url ?? row.candidates[0]?.url ?? null,
      }
    })

    // Priced rows first (cheapest on top), the rest after
    const sorted = [...list].sort((a, b) => {
      if (a.offer && b.offer) return (a.offer.price as number) - (b.offer.price as number)
      if (a.offer) return -1
      if (b.offer) return 1
      return 0
    })

    const priced = sorted.filter((r) => r.offer)
    const best = priced[0] ?? null
    const highest = priced[priced.length - 1] ?? null
    const savings =
      best && highest && priced.length > 1
        ? (highest.offer!.price as number) - (best.offer!.price as number)
        : 0
    const percent = savings > 0 && highest ? (savings / (highest.offer!.price as number)) * 100 : 0
    const finished = list.every((r) => r.status === 'done' || r.status === 'error')
    const loading = list.some((r) => r.status === 'loading')

    return { sorted, best, highest, savings, percent, finished, loading, pricedCount: priced.length }
  }, [rows])

  const hasSearched = searched !== ''

  const announce = view.loading
    ? 'Comparing prices across five stores.'
    : view.best
      ? 'Best price ' +
        (view.best.offer!.price as number).toFixed(2) +
        ' dollars at ' +
        view.best.label +
        (view.savings > 0 ? '. That is ' + view.savings.toFixed(2) + ' dollars less than the highest price.' : '.')
      : hasSearched
        ? 'No prices found.'
        : ''

  return (
    <section aria-labelledby="price-match-heading" className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <h2 id="price-match-heading" className="text-sm font-semibold tracking-tight">
          Smart Merchant Price Match
        </h2>
        <span className="text-xs text-muted-foreground">
          {hasSearched ? 'Searched ' + MERCHANTS.length + ' stores' : MERCHANTS.length + ' stores'}
        </span>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>

      <article className="glass rounded-3xl p-4">
        <form
          className="flex items-center gap-2 rounded-2xl border border-input bg-background/60 p-1.5 pl-3"
          onSubmit={(e) => {
            e.preventDefault()
            compare(query)
          }}
        >
          <label htmlFor="price-match-input" className="sr-only">
            Product to compare across stores
          </label>
          <input
            id="price-match-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scan an item or type a product…"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            disabled={view.loading || !query.trim()}
            aria-label="Compare prices across stores"
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-50',
              focusRing,
            )}
          >
            {view.loading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-3.5" aria-hidden="true" />
            )}
            Compare
          </button>
        </form>

        {!hasSearched && (
          <p className="mt-3 text-xs text-muted-foreground">
            Scan a product or type its name. QuickO checks Amazon, eBay, Target, Walmart and Best Buy at the same
            time.
          </p>
        )}

        {hasSearched && (
          <>
            <p className="mt-3 truncate text-[11px] uppercase tracking-wider text-muted-foreground">
              {searched}
            </p>

            <ul className="mt-2 flex flex-col gap-2" aria-label="Prices by store">
              {view.sorted.map((r) => {
                const isBest = view.best?.key === r.key
                const price = r.offer ? (r.offer.price as number) : null
                const pct =
                  price !== null && view.highest
                    ? Math.max(10, (price / (view.highest.offer!.price as number)) * 100)
                    : 0
                return (
                  <li
                    key={r.key}
                    className={cn(
                      'rounded-2xl border p-3',
                      isBest ? 'border-success/40 bg-success/[0.08]' : 'border-border bg-background/40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        {r.label}
                        {isBest && (
                          <span className="rounded-full bg-success px-1.5 py-0.5 text-[10px] font-semibold text-background">
                            Best
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        {r.status === 'loading' && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                            Searching…
                          </span>
                        )}
                        {r.status === 'error' && (
                          <span className="text-[11px] text-warning">Search failed</span>
                        )}
                        {r.status === 'done' && price === null && (
                          <span className="text-[11px] text-muted-foreground">No price found</span>
                        )}
                        {price !== null && (
                          <span
                            className={cn(
                              'font-mono text-sm font-semibold',
                              isBest ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            ${price.toFixed(2)}
                          </span>
                        )}
                        {r.link && r.status === 'done' && (
                          <a
                            href={r.link}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={'View on ' + r.label}
                            className={cn('rounded text-muted-foreground hover:text-foreground', focusRing)}
                          >
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                          </a>
                        )}
                      </span>
                    </div>

                    {price !== null && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-700',
                            isBest ? 'bg-success' : 'bg-primary/60',
                          )}
                          style={{ width: pct + '%' }}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            {view.savings > 0 && view.best && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-success">
                <TrendingDown className="size-3.5" aria-hidden="true" />
                <span>
                  {view.best.label} is <span className="font-semibold">${view.savings.toFixed(2)} cheaper</span> than
                  the highest ({view.percent.toFixed(1)}% saved)
                </span>
              </p>
            )}

            {view.finished && !view.best && (
              <p className="mt-3 text-xs text-muted-foreground">
                No prices could be read for this item. Try a more specific name, like brand and model.
              </p>
            )}

            {view.finished && view.best && (
              <ProductCheckout
                key={searched + '-' + view.best.key + '-' + (view.best.offer!.price as number)}
                item={{
                  title: searched,
                  price: view.best.offer!.price as number,
                  merchant: view.best.label,
                  url: view.best.offer!.url,
                }}
                savings={view.savings}
              />
            )}

            <p className="mt-3 text-[10px] text-muted-foreground">
              Prices are read from search results and can be out of date. Verify at checkout.
            </p>
          </>
        )}
      </article>
    </section>
  )
}