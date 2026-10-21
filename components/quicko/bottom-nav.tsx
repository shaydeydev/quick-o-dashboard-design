"use client"

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Home, Repeat, ShoppingBag, Wallet, X, CreditCard, CheckCircle2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrders, type OrderStatus } from '@/lib/orders-store'
import { useSubscriptions, togglePause } from '@/lib/subscriptions-store'

type NavItem = { label: string; icon: LucideIcon }

const items: NavItem[] = [
  { label: 'Home', icon: Home },
  { label: 'Orders', icon: ShoppingBag },
  { label: 'Subs', icon: Repeat },
  { label: 'Wallet', icon: Wallet },
  { label: 'Alerts', icon: Bell },
]

const orderStatusClass: Record<OrderStatus, string> = {
  Delivered: 'bg-emerald-500/20 text-emerald-400',
  'In Transit': 'bg-blue-500/20 text-blue-400',
  Processing: 'bg-amber-500/20 text-amber-400',
}

// 14 -> "14", 9.99 -> "9.99"
function fmtPrice(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  )
}

export function BottomNav() {
  const [activeTab, setActiveTab] = useState('Home')
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const orders = useOrders()
  const { items: subscriptions, paused } = useSubscriptions()

  const closeModal = () => {
    setActiveModal(null)
    setActiveTab('Home')
  }

  const handleNavClick = (label: string) => {
    setActiveTab(label)
    if (label !== 'Home') {
      setActiveModal(label)
    } else {
      setActiveModal(null)
    }
  }

  // Portal needs the browser, so wait until mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Escape closes the sheet
  useEffect(() => {
    if (!activeModal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModal(null)
        setActiveTab('Home')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeModal])

  if (!mounted) return null

  // Portal to <body> so no parent box can shrink or move the fixed bar
  return createPortal(
    <>
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <ul className="glass flex w-full items-center justify-between rounded-full bg-background/70 p-1.5">
          {items.map(({ label, icon: Icon }) => {
            const isActive = activeTab === label
            return (
              <li key={label} className="flex-1">
                <button
                  type="button"
                  onClick={() => handleNavClick(label)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex w-full flex-col items-center gap-1 rounded-full py-2.5 text-[11px] font-medium transition-colors',
                    isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Interactive Bottom Sheet Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center md:hidden">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={activeModal}
            className="relative w-full max-w-md rounded-3xl border border-white/10 bg-card p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4"
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full bg-white/5 p-2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" aria-hidden="true" />
            </button>

            {/* Orders Tab View (live from the shared store) */}
            {activeModal === 'Orders' && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                  <ShoppingBag className="size-5 text-primary" /> Order History
                </h3>
                {orders.length === 0 ? (
                  <EmptyState title="No orders yet" hint="Scan an item and buy it. It shows up here." />
                ) : (
                  <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">{order.title}</div>
                          <div className="text-xs text-muted-foreground">
                            ${order.price.toFixed(2)} · {order.merchant} · {order.method}
                          </div>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium',
                            orderStatusClass[order.status],
                          )}
                        >
                          {order.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Subs Tab View (live from the shared store) */}
            {activeModal === 'Subs' && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                  <Repeat className="size-5 text-primary" /> Subscription Priority Guard
                </h3>
                <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {subscriptions.map((sub, index) => {
                    const isPaused = !!paused[sub.id]
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">{sub.name}</div>
                          <div className="text-xs text-muted-foreground">
                            ${fmtPrice(sub.price)}/mo · Priority {index + 1}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[10px] font-medium',
                              isPaused ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400',
                            )}
                          >
                            {isPaused ? 'Paused' : 'Active'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePause(sub.id)}
                            aria-label={isPaused ? `Resume ${sub.name}` : `Pause ${sub.name}`}
                            className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                          >
                            {isPaused ? 'Resume' : 'Pause'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Wallet Tab View */}
            {activeModal === 'Wallet' && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                  <Wallet className="size-5 text-primary" /> QuickO Wallet & Accounts
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 p-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="size-6 text-primary" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">PayPal Sandbox Linked</div>
                        <div className="text-xs text-muted-foreground">1-Click Instant Checkout Ready</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">Connected</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="size-6 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">Visa ending in 4242</div>
                        <div className="text-xs text-muted-foreground">Default Backup Card</div>
                      </div>
                    </div>
                    <CheckCircle2 className="size-4 text-emerald-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Alerts Tab View (no fake alerts) */}
            {activeModal === 'Alerts' && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                  <Bell className="size-5 text-primary" /> Notifications
                </h3>
                <EmptyState title="No alerts right now" hint="Nothing needs you. All good." />
              </div>
            )}
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}
