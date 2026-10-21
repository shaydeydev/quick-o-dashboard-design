import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Only these merchants can be searched. Stops people using the route for anything else.
const MERCHANTS: Record<string, { label: string; domain: string }> = {
  amazon: { label: "Amazon", domain: "amazon.com" },
  ebay: { label: "eBay", domain: "ebay.com" },
  target: { label: "Target", domain: "target.com" },
  walmart: { label: "Walmart", domain: "walmart.com" },
  bestbuy: { label: "Best Buy", domain: "bestbuy.com" },
};

const PRICE_SOURCE = "\\$\\s?(\\d{1,4}(?:,\\d{3})*(?:\\.\\d{2})?)";

// First dollar amount that looks like a real price (skips "save $20", "$10 off", "shipping $5")
function extractPrice(text: string): number | null {
  const re = new RegExp(PRICE_SOURCE, "g");
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    const before = text.slice(Math.max(0, idx - 14), idx);
    const after = text.slice(idx + m[0].length, idx + m[0].length + 10);
    if (/(save|saves|saving|savings|coupon|rebate|shipping|cashback|back)\W*$/i.test(before)) continue;
    if (/^\s*(off|rebate|back|shipping)/i.test(after)) continue;
    const value = parseFloat(m[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = typeof body.query === "string" ? body.query.trim().slice(0, 200) : "";
    const key = typeof body.merchant === "string" ? body.merchant : "";
    const merchant = MERCHANTS[key];

    if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
    if (!merchant) return NextResponse.json({ error: "Unknown merchant" }, { status: 400 });
    if (!process.env.TAVILY_API_KEY) {
      return NextResponse.json({ error: "TAVILY_API_KEY missing" }, { status: 500 });
    }

    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.TAVILY_API_KEY,
      },
      body: JSON.stringify({
        query: query + " price",
        search_depth: "basic",
        max_results: 5,
        include_domains: [merchant.domain],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Tavily failed (" + res.status + ")" }, { status: 502 });
    }

    const data = await res.json();
    const candidates = (data.results ?? [])
      .filter((r: any) => {
        try {
          return new URL(r.url).hostname.endsWith(merchant.domain);
        } catch {
          return false;
        }
      })
      .map((r: any) => ({
        title: String(r.title ?? "").slice(0, 140),
        url: String(r.url),
        price: extractPrice(String(r.title ?? "") + " " + String(r.content ?? "")),
      }));

    return NextResponse.json({ merchant: merchant.label, candidates });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Search failed" }, { status: 500 });
  }
}