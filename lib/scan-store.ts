import { useSyncExternalStore } from "react";

export type ScanPhase = "idle" | "live" | "analyzing" | "pricing" | "found" | "error";

let phase: ScanPhase = "idle";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setScanPhase(next: ScanPhase) {
  if (next === phase) return;
  phase = next;
  listeners.forEach((l) => l());
}

export function getScanPhase() {
  return phase;
}

export function useScanPhase() {
  return useSyncExternalStore(subscribe, () => phase, () => "idle" as ScanPhase);
}