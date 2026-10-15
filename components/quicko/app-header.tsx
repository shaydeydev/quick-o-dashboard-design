import { Bell, Zap } from 'lucide-react'

export function AppHeader() {
  return (
    <header className="flex items-center justify-between px-5 pb-4 pt-5">
      <div className="flex items-center gap-3">
        <div className="glow-ring flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-glow">
          <Zap className="size-5 text-primary-foreground" fill="currentColor" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="glow-text text-xl font-semibold leading-none tracking-tight">
            Quick<span className="text-primary">O</span>
          </h1>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            Agent Ready
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="glass relative flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Notifications, 2 unread"
        >
          <Bell className="size-4" aria-hidden="true" />
          <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-primary" />
        </button>
        <div
          className="flex size-10 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground ring-1 ring-border"
          aria-label="Profile: Alex Rivera"
          role="img"
        >
          AR
        </div>
      </div>
    </header>
  )
}
