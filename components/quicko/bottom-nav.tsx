import { Bell, Home, Repeat, ShoppingBag, Wallet, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { label: string; icon: LucideIcon; active?: boolean; badge?: number }

const items: NavItem[] = [
  { label: 'Home', icon: Home, active: true },
  { label: 'Orders', icon: ShoppingBag },
  { label: 'Subs', icon: Repeat },
  { label: 'Wallet', icon: Wallet },
  { label: 'Alerts', icon: Bell, badge: 2 },
]

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <ul className="glass flex items-center justify-between rounded-full bg-background/70 p-1.5">
        {items.map(({ label, icon: Icon, active, badge }) => (
          <li key={label} className="flex-1">
            <a
              href="#"
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-medium transition-colors',
                active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
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
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
