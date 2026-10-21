// Shelf mode helpers: item type, price lookup per item, and sanity checks.

export type ShelfItem = {
  id: string;
  name: string;
  category: string;
  estimated_price_usd: number;
  // 0..1 fractions of the camera image, or null if the model gave no usable box
  box: { x: number; y: number; w: number; h: number } | null;
  status: "pending" | "priced" | "none";
  price: number;
  merchant: string;
  url?: string;
  // best price vs highest sane price found for this item
  saved: number;
  // price is far from the model's own estimate, so the user should check it
  suspicious: boolean;
};

export function toShelfItems(raw: any[]): ShelfItem[] {
  const stamp = Date.now();
  return raw.slice(0, 6).map(
    (r, i): ShelfItem => ({
      id: "shelf-" + stamp + "-" + i,
      name: String(r.name ?? "Item").slice(0, 80),
      category: String(r.category ?? "").slice(0, 40),
      estimated_price_usd: Number(r.estimated_price_usd) || 0,
      box:
        r.box &&
        typeof r.box.x === "number" &&
        typeof r.box.y === "number" &&
        typeof r.box.w === "number" &&
        typeof r.box.h === "number"
          ? { x: r.box.x, y: r.box.y, w: r.box.w, h: r.box.h }
          : null,
      status: "pending",
      price: 0,
      merchant: "",
      saved: 0,
      suspicious: false,
    }),
  );
}

function median(nums: number[]) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Drop prices far from the median (bad regex reads), then take the cheapest
function pickBest(offers: any[], estimate: number) {
  const priced = offers.filter((o) => typeof o.price === "number" && o.price > 0);
  if (!priced.length) return null;

  const m = median(priced.map((o) => o.price as number));
  const kept = priced.filter((o) => o.price >= m * 0.4 && o.price <= m * 2.5);
  if (!kept.length) return null;

  const prices = kept.map((o) => o.price as number);
  const best = kept.reduce((a, b) => (b.price < a.price ? b : a));
  const saved = Math.max(...prices) - Math.min(...prices);
  const suspicious = estimate > 0 && (best.price < estimate * 0.25 || best.price > estimate * 4);
  return { best, saved, suspicious };
}

// Price every item, 3 searches at a time. onUpdate fires as each one lands.
export async function priceShelfItems(
  items: ShelfItem[],
  onUpdate: (id: string, patch: Partial<ShelfItem>) => void,
  shouldStop: () => boolean,
) {
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const item = items[next++];
      if (shouldStop()) return;

      let patch: Partial<ShelfItem>;
      try {
        const res = await fetch("/api/tavily-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: item.name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Price search failed");

        const pick = pickBest(data.offers ?? [], item.estimated_price_usd);
        patch = pick
          ? {
              status: "priced",
              price: pick.best.price,
              merchant: pick.best.merchant,
              url: pick.best.url,
              saved: pick.saved,
              suspicious: pick.suspicious,
            }
          : { status: "none" };
      } catch {
        patch = { status: "none" };
      }

      if (shouldStop()) return;
      onUpdate(item.id, patch);
    }
  }

  await Promise.all([worker(), worker(), worker()]);
}