import { useSyncExternalStore } from "react";

// Is the scanner in the big AR view? Header button and scanner share this.
let expanded = false;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function setArExpanded(value: boolean) {
  if (expanded === value) return;
  expanded = value;
  listeners.forEach((l) => l());
}

export function toggleArExpanded() {
  setArExpanded(!expanded);
}

export function getArExpanded() {
  return expanded;
}

export function useArExpanded() {
  return useSyncExternalStore(subscribe, () => expanded, () => false);
}