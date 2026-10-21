import { useSyncExternalStore } from "react";

export type OrderStatus = "Processing" | "In Transit" | "Delivered";

export type Order = {
  id: string;
  title: string;
  merchant: string;
  price: number;
  method: string;
  status: OrderStatus;
};

// Starts empty. Orders only appear after a real (sandbox) PayPal purchase.
const initial: Order[] = [];

let orders: Order[] = initial;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Called after a PayPal payment completes
export function addOrder(input: {
  title: string;
  merchant: string;
  price: number;
  method?: string;
}) {
  const order: Order = {
    id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title,
    merchant: input.merchant,
    price: input.price,
    method: input.method ?? "1-Click PayPal",
    status: "Processing",
  };
  orders = [order, ...orders];
  listeners.forEach((l) => l());
  return order;
}

export function useOrders() {
  return useSyncExternalStore(subscribe, () => orders, () => initial);
}