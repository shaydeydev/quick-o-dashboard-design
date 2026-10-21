import { useSyncExternalStore } from "react";

export type CheckoutItem = {
  title: string;
  price: number;
  merchant: string;
  url?: string;
};

let current: CheckoutItem | null = null;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setCheckoutItem(item: CheckoutItem | null) {
  current = item;
  listeners.forEach((l) => l());
}

export function getCheckoutItem() {
  return current;
}

export function useCheckoutItem() {
  return useSyncExternalStore(subscribe, () => current, () => null);
}