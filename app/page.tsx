import { BalanceAlert } from '@/components/quicko/balance-alert'
import { AppHeader } from '@/components/quicko/app-header'
import { AgentPrompt } from '@/components/quicko/agent-prompt'
import { PriceMatch } from '@/components/quicko/price-match'
import { SubscriptionGuard } from '@/components/quicko/subscription-guard'
import { BottomNav } from '@/components/quicko/bottom-nav'

export default function Page() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-glow/30 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[45%] -right-32 h-72 w-72 rounded-full bg-glow/15 blur-[110px]"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <BalanceAlert />
        <AppHeader />
        <main className="flex flex-1 flex-col gap-6 px-5 pb-32 pt-2">
          <AgentPrompt />
          <PriceMatch />
          <SubscriptionGuard />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
