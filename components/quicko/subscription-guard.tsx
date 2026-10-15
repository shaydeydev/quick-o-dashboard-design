'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CalendarClock, GripVertical, Pause, Play } from 'lucide-react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'

type Subscription = {
  id: string
  name: string
  price: number
  renews: string
  logo: string
  logoClassName: string
}

const TODAY = new Date('2026-10-15T00:00:00')
const DAY_MS = 86_400_000

const initialSubscriptions: Subscription[] = [
  {
    id: 'prime',
    name: 'Amazon Prime',
    price: 14,
    renews: '2026-10-21',
    logo: '/images/logos/prime.jpg',
    logoClassName: 'object-cover',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    price: 11,
    renews: '2026-10-24',
    logo: '/images/logos/spotify.png',
    logoClassName: 'object-cover scale-[1.35] bg-black',
  },
  {
    id: 'netflix',
    name: 'Netflix',
    price: 15,
    renews: '2026-10-18',
    logo: '/images/logos/netflix.png',
    logoClassName: 'object-cover',
  },
]

const priorityLevels = [
  { label: 'High', className: 'border-primary/40 bg-primary/15 text-primary' },
  { label: 'Medium', className: 'border-sky-400/30 bg-sky-400/10 text-sky-300' },
  { label: 'Low', className: 'border-warning/30 bg-warning/10 text-warning' },
]

const tabs = [
  { id: 'guard', label: 'Subscription Priority Guard' },
  { id: 'renewals', label: 'Renewals' },
] as const

type TabId = (typeof tabs)[number]['id']

function daysUntil(isoDate: string) {
  return Math.round((new Date(`${isoDate}T00:00:00`).getTime() - TODAY.getTime()) / DAY_MS)
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function SubscriptionGuard() {
  const [tab, setTab] = useState<TabId>('guard')
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)
  const [paused, setPaused] = useState<Record<string, boolean>>({ netflix: true })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activeTotal = subscriptions.filter((s) => !paused[s.id]).reduce((sum, s) => sum + s.price, 0)

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    setSubscriptions((items) => {
      const from = items.findIndex((i) => i.id === active.id)
      const to = items.findIndex((i) => i.id === over.id)
      return arrayMove(items, from, to)
    })
  }

  function togglePause(id: string) {
    setPaused((p) => ({ ...p, [id]: !p[id] }))
  }

  return (
    <section aria-label="Subscriptions" className="flex flex-col gap-3">
      <div role="tablist" aria-label="Subscription views" className="glass flex rounded-2xl p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
              tab === t.id
                ? 'bg-primary/15 text-foreground ring-1 ring-primary/40'
                : 'text-muted-foreground hover:text-foreground',
              t.id === 'guard' && 'flex-[2]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'guard' ? (
        <div role="tabpanel" id="panel-guard" aria-labelledby="tab-guard" className="glass rounded-3xl p-2">
          <div className="flex items-center justify-between px-3 pb-2 pt-2">
            <p className="text-xs text-muted-foreground">Drag to reorder priority</p>
            <p className="font-mono text-xs">
              <span className="font-semibold text-foreground">${activeTotal.toFixed(2)}</span>
              <span className="text-muted-foreground"> / $30.00</span>
            </p>
          </div>
            <DndContext
              id="subscription-priority-dnd"
              sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={subscriptions.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-1">
                {subscriptions.map((sub, index) => (
                  <SortableRow
                    key={sub.id}
                    sub={sub}
                    rank={index}
                    isPaused={!!paused[sub.id]}
                    onTogglePause={() => togglePause(sub.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div role="tabpanel" id="panel-renewals" aria-labelledby="tab-renewals" className="glass rounded-3xl p-2">
          <ul className="flex flex-col gap-1">
            {[...subscriptions]
              .sort((a, b) => a.renews.localeCompare(b.renews))
              .map((sub) => {
                const days = daysUntil(sub.renews)
                const soon = days <= 3
                return (
                  <li key={sub.id} className="flex items-center gap-3 rounded-2xl px-3 py-3">
                    <SubLogo sub={sub} dimmed={!!paused[sub.id]} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{sub.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="size-3" aria-hidden="true" />
                        <time dateTime={sub.renews}>{formatDate(sub.renews)}</time>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          soon
                            ? 'border-warning/30 bg-warning/10 text-warning'
                            : 'border-border bg-secondary/50 text-muted-foreground',
                        )}
                      >
                        {days === 0 ? 'Today' : days === 1 ? 'in 1 day' : `in ${days} days`}
                      </span>
                      <span className="font-mono text-xs">
                        {paused[sub.id] ? <span className="text-muted-foreground">Paused</span> : `$${sub.price}`}
                      </span>
                    </div>
                  </li>
                )
              })}
          </ul>
        </div>
      )}
    </section>
  )
}

function SubLogo({ sub, dimmed }: { sub: Subscription; dimmed?: boolean }) {
  return (
    <span
      className={cn(
        'relative size-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 transition-opacity',
        dimmed && 'opacity-50 grayscale',
      )}
    >
      <Image src={sub.logo} alt={`${sub.name} logo`} fill sizes="40px" className={sub.logoClassName} />
    </span>
  )
}

function SortableRow({
  sub,
  rank,
  isPaused,
  onTogglePause,
}: {
  sub: Subscription
  rank: number
  isPaused: boolean
  onTogglePause: () => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: sub.id })
  const level = priorityLevels[Math.min(rank, priorityLevels.length - 1)]

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative flex items-center gap-2 rounded-2xl py-3 pl-1 pr-3 transition-[background-color,box-shadow]',
        isPaused ? 'bg-background/30' : 'bg-secondary/40',
        isDragging && 'z-10 bg-secondary shadow-2xl ring-1 ring-primary/50 glow-ring',
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${sub.name}, currently priority ${rank + 1}`}
        className="flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <SubLogo sub={sub} dimmed={isPaused} />
      <div className="min-w-0 flex-1 pl-1">
        <div className="flex items-center gap-2">
          <p className={cn('truncate text-sm font-medium', isPaused && 'text-muted-foreground')}>{sub.name}</p>
          {isPaused && (
            <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
              Paused
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">${sub.price}/mo</span>
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', level.className)}>
            Priority {rank + 1} · {level.label}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onTogglePause}
        aria-label={isPaused ? `Resume ${sub.name}` : `Pause ${sub.name}`}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        {isPaused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
      </button>
    </li>
  )
}
