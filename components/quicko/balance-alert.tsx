import { ShieldCheck } from 'lucide-react'

export function BalanceAlert() {
  return (
    <div role="status" className="px-4 pt-3">
      <div className="flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning/[0.07] px-3.5 py-2.5 backdrop-blur-xl">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
        </span>
        <p className="text-xs leading-relaxed text-foreground/90">
          <span className="font-semibold text-foreground">PayPal Balance: </span>
          <span className="font-mono font-semibold text-warning">$30.00</span>
          <span className="text-muted-foreground">{' — '}</span>
          Auto-Pause Shield Active for Priority 3 items.
        </p>
      </div>
    </div>
  )
}
