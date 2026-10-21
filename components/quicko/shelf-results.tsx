'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, ShoppingBag } from 'lucide-react'
import QuickOPayPalCheckout from './paypal-button'
import { addOrder } from '@/lib/orders-store'
import { addSavings } from '@/lib/savings-store'
import type { ShelfItem } from '@/lib/shelf'

type Step = 'review' | 'pay' | 'ordered'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#12141c]'

export function ShelfResults({ items }: { items: ShelfItem[] }) {
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [step, setStep] = useState<Step>('review')
  const decided = useRef<Set<string>>(new Set())

  // Tick each item once, when its price arrives. Odd-looking prices start unticked.
  useEffect(() => {
    const fresh: Record<string, boolean> = {}
    for (const it of items) {
      if (it.status === 'priced' && !decided.current.has(it.id)) {
        decided.current.add(it.id)
        fresh[it.id] = !it.suspicious
      }
    }
    if (Object.keys(fresh).length) setPicked((p) => ({ ...p, ...fresh }))
  }, [items])

  const pending = items.filter((i) => i.status === 'pending').length
  const selected = items.filter((i) => i.status === 'priced' && picked[i.id])
  const total = Math.round(selected.reduce((sum, i) => sum + i.price, 0) * 100) / 100
  const saved = Math.round(selected.reduce((sum, i) => sum + i.saved, 0) * 100) / 100

  function onPaid() {
    for (const it of selected) {
      addOrder({ title: it.name, merchant: it.merchant, price: it.price, method: '1-Click PayPal' })
    }
    if (saved > 0) addSavings(saved)
    setStep('ordered')
  }

  return (
    <div className="flex flex-col gap-2 text-white">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          Shelf: {items.length} product{items.length === 1 ? '' : 's'} found
        </p>
        {pending > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-slate-300">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Pricing {pending} more…
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {items.map((it, i) => {
          const id = `shelf-item-${it.id}`
          const canPick = it.status === 'priced' && step === 'review'
          return (
            <li
              key={it.id}
              className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            >
              <input
                id={id}
                type="checkbox"
                checked={!!picked[it.id] && it.status === 'priced'}
                disabled={!canPick}
                onChange={(e) => setPicked((p) => ({ ...p, [it.id]: e.target.checked }))}
                className={`mt-1 size-4 accent-emerald-400 ${focusRing}`}
              />
              <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex size-4 shrink-0 items-center justify-center rounded bg-white/20 text-[10px] font-bold"
                  >
                    {i + 1}
                  </span>
                  <span className="truncate text-xs font-semibold">{it.name}</span>
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-300">
                  {it.status === 'pending' && 'Looking up price…'}
                  {it.status === 'none' &&
                    `No verified price found${
                      it.estimated_price_usd > 0 ? ` (AI guess ~$${it.estimated_price_usd.toFixed(0)})` : ''
                    }. Not included in checkout.`}
                  {it.status === 'priced' && (
                    <>
                      ${it.price.toFixed(2)} at {it.merchant}
                      {it.saved > 0 && ` · save $${it.saved.toFixed(2)} vs highest`}
                    </>
                  )}
                </span>
                {it.status === 'priced' && it.suspicious && (
                  <span className="mt-0.5 block text-[11px] font-medium text-amber-300">
                    Price looks off compared to the AI guess. Check before buying.
                  </span>
                )}
              </label>
            </li>
          )
        })}
      </ul>

      {step === 'review' && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" aria-live="polite" className="text-xs text-slate-200">
            {selected.length} selected · <span className="font-semibold">${total.toFixed(2)}</span>
            {saved > 0 && <span className="text-emerald-300"> · save ${saved.toFixed(2)}</span>}
          </p>
          <button
            type="button"
            onClick={() => setStep('pay')}
            disabled={pending > 0 || selected.length === 0}
            className={`flex items-center gap-1.5 rounded-lg bg-[#ffc439] px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50 ${focusRing}`}
          >
            <ShoppingBag className="size-3.5" aria-hidden="true" />
            Buy {selected.length} item{selected.length === 1 ? '' : 's'} · ${total.toFixed(2)}
          </button>
        </div>
      )}

      {step === 'pay' && (
        <div className="space-y-2 rounded-2xl border border-white/15 bg-black/20 p-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>
              {selected.length} item{selected.length === 1 ? '' : 's'}, one payment
            </span>
            <span className="text-emerald-300">${total.toFixed(2)}</span>
          </div>
          <div className="mx-auto w-full max-w-md">
            <QuickOPayPalCheckout
              amount={total.toFixed(2)}
              itemTitle={`QuickO shelf order (${selected.length} items)`}
              onSuccess={onPaid}
            />
          </div>
          <button
            type="button"
            onClick={() => setStep('review')}
            className={`rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white hover:bg-white/10 ${focusRing}`}
          >
            Back to selection
          </button>
        </div>
      )}

      {step === 'ordered' && (
        <p role="status" className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Ordered {selected.length} item{selected.length === 1 ? '' : 's'} for ${total.toFixed(2)} via PayPal.
          {saved > 0 && ` You saved $${saved.toFixed(2)}.`}
        </p>
      )}

      <p className="text-[10px] text-slate-400">Prices come from web search snippets. Verify at checkout.</p>
    </div>
  )
}