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

const seed: Order[] = [
  {
    id: "seed-rtx",
    title: "GeForce RTX 4060 Ti",
    merchant: "Newegg",
    price: 399,
    method: "1-Click PayPal",
    status: "Delivered",
  },
  {
    id: "seed-sony",
    title: "Sony WH-1000XM5 Headphones",
    merchant: "Walmart",
    price: 329,
    method: "Checkout",
    status: "In Transit",
  },
];

let orders: Order[] = seed;
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
    id: `order-${Date.now()}`,
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
  return useSyncExternalStore(subscribe, () => orders, () => seed);
}