import { useSyncExternalStore } from "react";

export type Subscription = {
  id: string;
  name: string;
  price: number;
  renews: string;
  logo: string;
  logoClassName: string;
};

type State = {
  items: Subscription[];
  paused: Record<string, boolean>;
};

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
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function togglePause(id: string) {
  state = { ...state, paused: { ...state.paused, [id]: !state.paused[id] } };
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

export function useSubscriptions() {
  return useSyncExternalStore(subscribe, () => state, () => initial);
}