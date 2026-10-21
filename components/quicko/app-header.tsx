'use client'

import { useState } from 'react'
import {
  Home,
  ShoppingBag,
  RefreshCw,
  Wallet,
  Bell,
  X,
  Check,
  PiggyBank,
} from 'lucide-react'
import { useOrders, type OrderStatus } from '@/lib/orders-store'
import { useSubscriptions, togglePause } from '@/lib/subscriptions-store'
import { useSavings } from '@/lib/savings-store'
import { toggleArExpanded, useArExpanded } from '@/lib/ar-store'

const orderStatusClass: Record<OrderStatus, string> = {
  Delivered: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  'In Transit': 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  Processing: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
}

export function AppHeader() {
  const [activeTab, setActiveTab] = useState('home')
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const orders = useOrders()
  const { items: subscriptions, paused } = useSubscriptions()
  const saved = useSavings()
  const arOpen = useArExpanded()

  const handleNavClick = (id: string) => {
    setActiveTab(id)

    if (id === 'home') {
      setActiveModal(null)
    } else {
      setActiveModal(id)
    }
  }

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'subs', label: 'Subscriptions', icon: RefreshCw },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: '2' },
  ]

  return (
    <div className="relative w-full">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#12141c]/80 px-6 py-3.5 shadow-lg backdrop-blur-xl">
        {/* Brand Logo & Status */}
        <button
          type="button"
          className="flex cursor-pointer items-center gap-3 text-left"
          onClick={() => handleNavClick('home')}
          aria-label="Go to Home"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8266d2] text-white shadow-lg shadow-[#8266d2]/25">
            <span className="text-xl font-black">Q</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                QuickO
              </h1>

              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                AGENT READY
              </span>
            </div>
          </div>
        </button>

        {/* Desktop Navigation Bar */}
        <nav
          className="hidden items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 p-1.5 md:flex"
          aria-label="Main navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={
                  isActive
                    ? 'relative flex cursor-pointer items-center gap-2 rounded-lg bg-[#8266d2] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#8266d2]/30 transition-all'
                    : 'relative flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 transition-all hover:bg-white/5 hover:text-white'
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>

                {item.badge && (
                  <span
                    className={
                      isActive
                        ? 'ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-[#8266d2]'
                        : 'ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#8266d2] text-[9px] font-bold text-white'
                    }
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {/* Savings counter. Announced to screen readers when it changes. */}
          <div
            role="status"
            aria-live="polite"
            className={
              saved > 0
                ? 'flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition-colors'
                : 'flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 transition-colors'
            }
          >
            <PiggyBank className="h-4 w-4" aria-hidden="true" />
            <span>
              You saved ${saved.toFixed(2)}
              <span className="hidden sm:inline"> this session</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleNavClick('alerts')}
            aria-label="Open alerts"
            className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#8266d2]" />
          </button>

          {/* AR button: makes the scanner bigger (press again to shrink it) */}
          <button
            type="button"
            onClick={toggleArExpanded}
            aria-pressed={arOpen}
            aria-label="Big AR scanner view"
            title={arOpen ? 'Make the scanner smaller' : 'Open the big AR scanner'}
            className={
              arOpen
                ? 'flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[#8266d2] bg-[#8266d2] text-xs font-bold text-white shadow-md shadow-[#8266d2]/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#12141c]'
                : 'flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[#8266d2]/30 bg-[#8266d2]/20 text-xs font-bold text-[#a995f5] transition-colors hover:bg-[#8266d2]/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#12141c]'
            }
          >
            AR
          </button>
        </div>
      </header>

      {/* Interactive Modals */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setActiveModal(null)
              setActiveTab('home')
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#12141c] p-6 shadow-2xl backdrop-blur-2xl"
          >
            {/* Modal Header */}
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8266d2]/20 text-[#8266d2]">
                  {activeModal === 'orders' && (
                    <ShoppingBag className="h-4 w-4" />
                  )}

                  {activeModal === 'subs' && (
                    <RefreshCw className="h-4 w-4" />
                  )}

                  {activeModal === 'wallet' && (
                    <Wallet className="h-4 w-4" />
                  )}

                  {activeModal === 'alerts' && (
                    <Bell className="h-4 w-4" />
                  )}
                </div>

                <h3
                  id="modal-title"
                  className="text-base font-bold capitalize text-white"
                >
                  {activeModal === 'subs'
                    ? 'Subscriptions'
                    : activeModal}{' '}
                  Manager
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveModal(null)
                  setActiveTab('home')
                }}
                aria-label="Close modal"
                className="cursor-pointer rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="py-2">
              {/* Orders (live from the shared store) */}
              {activeModal === 'orders' && (
                <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 p-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-white">{order.title}</p>
                        <p className="text-[11px] text-slate-400">
                          Merchant: {order.merchant} | ${order.price.toFixed(2)} | {order.method}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${orderStatusClass[order.status]}`}
                      >
                        {order.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Subscriptions (live from the shared store) */}
              {activeModal === 'subs' && (
                <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {subscriptions.map((sub, index) => {
                    const isPaused = !!paused[sub.id]
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 p-3.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">{sub.name}</p>
                          <p className="text-[11px] text-slate-400">
                            ${Number.isInteger(sub.price) ? sub.price : sub.price.toFixed(2)}/mo | Priority {index + 1}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={
                              isPaused
                                ? 'rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-400'
                                : 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400'
                            }
                          >
                            {isPaused ? 'Paused' : 'Active'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePause(sub.id)}
                            aria-label={isPaused ? `Resume ${sub.name}` : `Pause ${sub.name}`}
                            className="cursor-pointer rounded-lg border border-white/10 px-2 py-1 text-[10px] font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            {isPaused ? 'Resume' : 'Pause'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Wallet */}
              {activeModal === 'wallet' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#8266d2]/30 bg-[#8266d2]/20 p-5">
                    <p className="text-xs font-medium text-slate-300">
                      PayPal Express Balance
                    </p>

                    <p className="mt-1 text-3xl font-black text-white">
                      $30.00
                    </p>

                    <p className="mt-2 flex items-center gap-1 text-[11px] text-emerald-400">
                      <Check className="h-3 w-3" />
                      Wallet connected and ready
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        Payment method
                      </span>
                      <span className="text-xs font-semibold text-white">
                        PayPal Express
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        Payment status
                      </span>
                      <span className="text-xs font-semibold text-emerald-400">
                        Ready
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Alerts */}
              {activeModal === 'alerts' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8266d2]/20 text-[#a995f5]">
                      <Bell className="h-4 w-4" />
                    </div>

                    <div className="flex-1">
                      <p className="text-xs font-semibold text-white">
                        Price Alert
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        An item on your watchlist may have a price update.
                      </p>
                      <p className="mt-2 text-[10px] text-slate-500">
                        Recent notification
                      </p>
                    </div>

                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#8266d2]" />
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Check className="h-4 w-4" />
                    </div>

                    <div className="flex-1">
                      <p className="text-xs font-semibold text-white">
                        Agent Ready
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        QuickO is ready to help manage your shopping activity.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-5 flex justify-end border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null)
                  setActiveTab('home')
                }}
                className="cursor-pointer rounded-xl bg-[#8266d2] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#7255c2]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}