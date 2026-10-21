import { useSyncExternalStore } from "react";

export type Subscription = {
  id: string;
  name: string;
  price: number;
  renews: string;
  logo: string;
  logoClassName: string;
  // true for subscriptions the user added by hand
  custom?: boolean;
};

type State = {
  items: Subscription[];
  paused: Record<string, boolean>;
};

// The demo PayPal balance the Subscription Guard protects
export const PAYPAL_BALANCE = 30;

const initial: State = {
  items: [
    {
      id: "prime",
      name: "Amazon Prime",
      price: 14,
      renews: "2026-10-21",
      logo: "/images/logos/prime.jpg",
      logoClassName: "object-cover",
    },
    {
      id: "spotify",
      name: "Spotify",
      price: 11,
      renews: "2026-10-24",
      logo: "/images/logos/spotify.png",
      logoClassName: "object-cover scale-[1.35] bg-black",
    },
    {
      id: "netflix",
      name: "Netflix",
      price: 15,
      renews: "2026-10-18",
      logo: "/images/logos/netflix.png",
      logoClassName: "object-cover",
    },
  ],
  paused: { netflix: true },
};

let state: State = initial;
let counter = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Read the current state outside React (used by the chat)
export function getSubscriptions() {
  return state;
}

export function togglePause(id: string) {
  state = { ...state, paused: { ...state.paused, [id]: !state.paused[id] } };
  emit();
}

// Set pause on or off for sure. Does nothing if already in that state.
export function setPaused(id: string, value: boolean) {
  if (!!state.paused[id] === value) return;
  state = { ...state, paused: { ...state.paused, [id]: value } };
  emit();
}

export function reorderSubscriptions(activeId: string, overId: string) {
  const items = [...state.items];
  const from = items.findIndex((i) => i.id === activeId);
  const to = items.findIndex((i) => i.id === overId);
  if (from < 0 || to < 0 || from === to) return;
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  state = { ...state, items };
  emit();
}

// ---------- Add / remove subscriptions by hand ----------

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Is this subscription already tracked? ("Spotify Premium" matches "Spotify")
export function findExistingSubscription(name: string): Subscription | null {
  const n = norm(name);
  if (!n) return null;
  return (
    state.items.find((i) => {
      const e = norm(i.name);
      if (e === n) return true;
      if (n.length < 4 || e.length < 4) return false;
      return e.includes(n) || n.includes(e);
    }) ?? null
  );
}

const LOGO_COLORS = ["#6d5bd0", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];

// Colored letter icon as an inline SVG, used when no image was uploaded
function makeLetterLogo(name: string) {
  const match = name.trim().match(/[A-Za-z0-9]/);
  const letter = (match ? match[0] : "?").toUpperCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const color = LOGO_COLORS[h % LOGO_COLORS.length];
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' +
    '<rect width="40" height="40" fill="' + color + '"/>' +
    '<text x="20" y="27" font-family="Arial,sans-serif" font-size="20" font-weight="700" ' +
    'text-anchor="middle" fill="#ffffff">' + letter + "</text></svg>";
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export type AddResult = { ok: true; name: string } | { ok: false; error: string };

// New subscriptions go to the END of the list = lowest priority
export function addSubscription(input: {
  name: string;
  price: number;
  renews: string;
  logo?: string | null;
}): AddResult {
  const name = input.name.trim().slice(0, 40);
  const price = Math.round(input.price * 100) / 100;

  if (!name) return { ok: false, error: "Enter a name for the subscription." };
  if (!Number.isFinite(price) || price <= 0 || price > 999) {
    return { ok: false, error: "Enter a monthly price between $0.01 and $999." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.renews)) {
    return { ok: false, error: "Pick a renewal date." };
  }
  const existing = findExistingSubscription(name);
  if (existing) return { ok: false, error: `${existing.name} is already in your list.` };

  counter += 1;
  const sub: Subscription = {
    id: "sub-" + Date.now() + "-" + counter,
    name,
    price,
    renews: input.renews,
    logo: input.logo || makeLetterLogo(name),
    logoClassName: "object-cover",
    custom: true,
  };
  state = { ...state, items: [...state.items, sub] };
  emit();
  return { ok: true, name };
}

// Only subscriptions added by hand can be removed
export function removeSubscription(id: string) {
  const target = state.items.find((i) => i.id === id);
  if (!target || !target.custom) return;
  const paused = { ...state.paused };
  delete paused[id];
  state = { ...state, items: state.items.filter((i) => i.id !== id), paused };
  emit();
}

// Pause from the bottom of the list up until the active total fits the budget.
// Returns the names that were paused.
export function pauseToFitBudget(budget: number): string[] {
  const names: string[] = [];
  const paused = { ...state.paused };
  const total = () =>
    state.items.filter((i) => !paused[i.id]).reduce((sum, i) => sum + i.price, 0);

  for (let i = state.items.length - 1; i >= 0 && total() > budget + 0.001; i--) {
    const item = state.items[i];
    if (!paused[item.id]) {
      paused[item.id] = true;
      names.push(item.name);
    }
  }
  if (names.length) {
    state = { ...state, paused };
    emit();
  }
  return names;
}

export function useSubscriptions() {
  return useSyncExternalStore(subscribe, () => state, () => initial);
}