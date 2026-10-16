'use client'

import QuickOPayPalCheckout from "./paypal-button";
import { useState } from 'react'
import Image from 'next/image'
import { Check, Headphones, Loader2, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'processing' | 'done'

export function PriceMatch() {
  const [status, setStatus] = useState<Status>('idle')

  function checkout() {
    if (status !== 'idle') return
    setStatus('processing')
    setTimeout(() => setStatus('done'), 1400)
  }

  return (
    <section aria-labelledby="price-match-heading" className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <h2 id="price-match-heading" className="text-sm font-semibold tracking-tight">
          Smart Merchant Price Match
        </h2>
        <span className="text-xs text-muted-foreground">Scanned 2 stores</span>
      </div>

      <article className="glass rounded-3xl p-4">
        <div className="flex items-center gap-3">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-secondary ring-1 ring-border">
            <Image
src="/images/sony-xm5.jpg"
  alt="Sony WH-1000XM5 headphones in black"
  fill
  sizes="64px"
  className="bg-[#eef0f4] object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Headphones className="size-3" aria-hidden="true" />
              Audio
            </p>
            <h3 className="mt-0.5 truncate text-sm font-semibold">Sony WH-1000XM5 Headphones</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Noise cancelling · Black</p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-border bg-background/40 p-3">
            <dt className="text-xs text-muted-foreground">Amazon</dt>
            <dd className="mt-1 font-mono text-lg font-semibold text-muted-foreground line-through decoration-muted-foreground/50">
              $348
            </dd>
          </div>
          <div className="relative rounded-2xl border border-success/40 bg-success/[0.08] p-3">
            <dt className="flex items-center justify-between text-xs text-success">
              Walmart
              <span className="rounded-full bg-success px-1.5 py-0.5 text-[10px] font-semibold text-background">
                Best
              </span>
            </dt>
            <dd className="mt-1 font-mono text-lg font-semibold text-foreground">$329</dd>
          </div>
        </dl>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-success">
          <TrendingDown className="size-3.5" aria-hidden="true" />
          Walmart is <span className="font-semibold">$19 cheaper</span> — 5.5% saved
        </p>

        <button
          type="button"
          onClick={checkout}
          disabled={status !== 'idle'}
          aria-live="polite"
          className={cn(
            'mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] disabled:cursor-default',
            status === 'done'
              ? 'bg-success/15 text-success ring-1 ring-success/40'
              : 'bg-gradient-to-r from-primary to-glow text-primary-foreground glow-ring',
          )}
        >
          {status === 'idle' && (
             <div className="w-full mt-2">
              <QuickOPayPalCheckout 
               amount="329.00" 
               itemTitle="Sony WH-1000XM5 Headphones" 
             />
           </div>
         )}
          {status === 'processing' && (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Securing best price…
            </>
          )}
          {status === 'done' && (
            <>
              <Check className="size-4" aria-hidden="true" />
              Ordered from Walmart · $329
            </>
          )}
        </button>
      </article>
    </section>
  )
}

function PayPalMark() {
  return (
    <span
      aria-hidden="true"
      className="flex size-5 items-center justify-center rounded-md bg-primary-foreground/90 text-[11px] font-black italic text-primary"
    >
      P
    </span>
  )
}
