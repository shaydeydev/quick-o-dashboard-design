import { useSyncExternalStore } from 'react'

// Total money saved this session. In memory only, resets on refresh.
let total = 0
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function emit() {
  listeners.forEach((l) => l())
}

// Call this when the user actually buys something. Ignores bad numbers.
export function addSavings(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return
  total = Math.round((total + amount) * 100) / 100
  emit()
}

export function getSavings() {
  return total
}

export function useSavings() {
  return useSyncExternalStore(subscribe, () => total, () => 0)
}