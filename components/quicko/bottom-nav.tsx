"use client"

import { useState } from 'react'
import { Bell, Home, Repeat, ShoppingBag, Wallet, X, CreditCard, CheckCircle2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { label: string; icon: LucideIcon; badge?: number }

const items: NavItem[] = [
  { label: 'Home', icon: Home },
  { label: 'Orders', icon: ShoppingBag },
  { label: 'Subs', icon: Repeat },
  { label: 'Wallet', icon: Wallet },
  { label: 'Alerts', icon: Bell, badge: 2 },
]

export function BottomNav() {
  const [activeTab, setActiveTab] = useState('Home')
  const [activeModal, setActiveModal] = useState<string | null>(null)

  const handleNavClick = (label: string) => {
    setActiveTab(label)
    if (label !== 'Home') {
      setActiveModal(label)
    } else {
      setActiveModal(null)
    }
  }

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <ul className="glass flex items-center justify-between rounded-full bg-background/70 p-1.5">
          {items.map(({ label, icon: Icon, badge }) => {
            const isActive = activeTab === label
            return (
              <li key={label} className="flex-1">
                <button
                  type="button"
                  onClick={() => handleNavClick(label)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex w-full flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-medium transition-colors',
                    isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="relative">
                    <Icon className="size-4" aria-hidden="true" />
                    {badge ? (
                      <span className="absolute -right-2 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground shadow-[0_0_8px_var(--color-primary)] ring-2 ring-background">
                        {badge}
                        <span className="sr-only"> unread</span>
                      </span>
                    ) : null}
                  </span>
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Interactive Bottom Sheet Modals with z-[9999] */}
      {activeModal && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-card p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
            <button
              onClick={() => {
                setActiveModal(null)
                setActiveTab('Home')
              }}
              className="absolute right-4 top-4 rounded-full bg-white/5 p-2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>

            {/* Orders Tab View */}
            {activeModal === 'Orders' && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                  <ShoppingBag className="size-5 text-primary" /> Order History
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <div className="text-sm font-semibold text-foreground">NVIDIA RTX Graphics Card</div>
                      <div className="text-xs text-emerald-400">$649.00 · Price Matched & Paid via PayPal</div>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-medium text-emerald-400">Processing</span>
                  </div>
                  <div className="flex justify-between items-center rounded-2xl border border-white/5 bg-white/5 p-4 opacity-75">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Starbucks Pumpkin Spice Latte</div>
                      <div className="text-xs text-muted-foreground">$6.45 · Venti · Delivered</div>
                    </div>
                    <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-[10px] font-medium text-blue-400">Completed</span>
                  </div>
                </div>
              </div>
            )}

            {/* Subs Tab View (Updated with Amazon Prime & NVIDIA GeForce Now) */}
            {activeModal === 'Subs' && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                  <Repeat className="size-5 text-primary" /> Subscription Priority Guard
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Amazon Prime</div>
                      <div className="text-xs text-muted-foreground">$14.00/mo · Priority 1 (Protected)</div>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-medium text-emerald-400">Active</span>
                  </div>
                  <div className="flex justify-between items-center rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <div className="text-sm font-semibold text-foreground">NVIDIA GeForce Now</div>
                      <div className="text-xs text-muted-foreground">$9.99/mo · Priority 2 (Protected)</div>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-medium text-emerald-400">Active</span>
                  </div>
                  <div className="flex justify-between items-center rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Spotify Premium</div>
                      <div className="text-xs text-muted-foreground">$10.99/mo · Priority 3</div>
                    </div>
                    <span className="rounded-full bg-purple-500/20 px-2.5 py-1 text-[10px] font-medium text-purple-300">Active</span>
                  </div>
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

            {/* Alerts Tab View */}
            {activeModal === 'Alerts' && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                  <Bell className="size-5 text-primary" /> Active Notifications
                </h3>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <div className="text-sm font-semibold text-emerald-400">Price Drop Alert!</div>
                    <div className="mt-1 text-xs text-muted-foreground">NVIDIA RTX Graphics Card fell by $45.00. 1-Click Price Match ready.</div>
                  </div>
                  <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
                    <div className="text-sm font-semibold text-purple-300">Upcoming Renewal</div>
                    <div className="mt-1 text-xs text-muted-foreground">Amazon Prime ($14.00) renews in 5 days. QuickO Priority Guard active.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}