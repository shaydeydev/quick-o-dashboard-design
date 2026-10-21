import { BalanceAlert } from '@/components/quicko/balance-alert'
import { AppHeader } from '@/components/quicko/app-header'
import { AgentPrompt } from '@/components/quicko/agent-prompt'
import { PriceMatch } from '@/components/quicko/price-match'
import { SubscriptionGuard } from '@/components/quicko/subscription-guard'
import PhysicalAIScanner from '@/components/quicko/physical-ai-scanner'
import { BottomNav } from '@/components/quicko/bottom-nav'
import Interactive3DBackground from '@/components/Interactive3DBackground'
import IntroOverlay from '@/components/IntroOverlay'

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0b0f17] text-white">
      <Interactive3DBackground />
      <IntroOverlay />

      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#8266d2]/15 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[30%] -right-32 h-[400px] w-[400px] rounded-full bg-[#8266d2]/10 blur-[130px]"
      />

      {/* Main Desktop Dashboard Container */}
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        
        {/* Top Header & Alert Banner */}
        <header className="mb-6 flex flex-col gap-4">
          <BalanceAlert />
          <AppHeader />
        </header>

        {/* FRONT & CENTER: Physical AI Scanner Hero Section */}
        <section className="mb-6">
          <PhysicalAIScanner />
        </section>

        {/* Desktop Grid Layout: Main Chat Stream + Sidebar Widgets */}
        <main className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-3 pb-16">
          
          {/* Left / Center: Agent Chat Stream */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="rounded-3xl border border-white/10 bg-[#12141c]/60 p-6 shadow-xl backdrop-blur-xl h-full flex flex-col">
              <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Active Command Stream</h2>
                  <p className="text-xs text-slate-400">Powered by Nebius Nemotron & Tavily Search Engine</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <div className="flex-1">
                <AgentPrompt />
              </div>
            </div>
          </div>

          {/* Right Sidebar: Subscription Guard & Price Match Widgets */}
          <aside className="flex flex-col gap-6 lg:col-span-1">
            <div className="rounded-3xl border border-white/10 bg-[#12141c]/60 p-5 shadow-xl backdrop-blur-xl">
              <SubscriptionGuard />
            </div>
            
            <div className="rounded-3xl border border-white/10 bg-[#12141c]/60 p-5 shadow-xl backdrop-blur-xl">
              <PriceMatch />
            </div>
          </aside>

        </main>
      </div>

      {/* Mobile Only Navigation Bar */}
      <div className="block lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <BottomNav />
      </div>
    </div>
  )
}