'use client'

import { useState } from 'react'
import { ShoppingBag, CheckCircle2 } from 'lucide-react'
import QuickOPayPalCheckout from './paypal-button'
import type { CheckoutItem } from '@/lib/checkout-store'
import { addOrder } from '@/lib/orders-store'

type Step = 'initial' | 'checkout' | 'ordered'

export function ProductCheckout({
  item,
  startOpen = false,
}: {
  item: CheckoutItem
  startOpen?: boolean
}) {
  const [step, setStep] = useState<Step>(startOpen ? 'checkout' : 'initial')
  const valid = Number.isFinite(item.price) && item.price > 0
  const amount = valid ? item.price.toFixed(2) : '0.00'

  if (!valid) {
    return (
      <div className="mt-3 rounded-2xl border border-white/10 bg-background/60 p-3 text-xs text-muted-foreground">
        No verified price found for {item.title}, so checkout isn&apos;t available.
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-primary/30 bg-background/60 p-3">
      {step === 'initial' && (
        <div className="space-y-2">
          <div>
            <div className="text-xs font-semibold text-foreground">{item.title}</div>
            <div className="text-[11px] text-emerald-400">
              ${amount} · {item.merchant} · Lowest price found
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStep('checkout')}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90"
          >
            <ShoppingBag className="size-3.5" /> Continue to 1-Click Checkout
          </button>
        </div>
      )}

      {step === 'checkout' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="truncate pr-2">
              {item.title} · {item.merchant}
            </span>
            <span className="text-primary">${amount}</span>
          </div>
          {/* Cap the width so the PayPal button never stretches wider than it renders */}
          <div className="mx-auto w-full max-w-md">
            <QuickOPayPalCheckout
              amount={amount}
              itemTitle={`${item.title} (${item.merchant})`}
              onSuccess={() => {
                addOrder({
                  title: item.title,
                  merchant: item.merchant,
                  price: item.price,
                  method: '1-Click PayPal',
                })
                setStep('ordered')
              }}
            />
          </div>
        </div>
      )}

      {step === 'ordered' && (
        <div className="flex items-center gap-2 py-1 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="size-4" /> Ordered! {item.title} purchased via PayPal.
        </div>
      )}
    </div>
  )
}