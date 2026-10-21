import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const priceRegex = /\$\s?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/;

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
    if (!process.env.TAVILY_API_KEY) {
      return NextResponse.json({ error: "TAVILY_API_KEY missing" }, { status: 500 });
    }

    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: `${query} buy price`,
        search_depth: "basic",
        max_results: 10,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Tavily failed", detail: await res.text() }, { status: 502 });
    }

    const data = await res.json();
    const seen = new Set<string>();
    const offers = (data.results ?? [])
      .map((r: any) => {
        const m = `${r.title} ${r.content}`.match(priceRegex);
        const domain = new URL(r.url).hostname.replace(/^www\./, "");
        return {
          title: r.title,
          url: r.url,
          merchant: domain,
          price: m ? parseFloat(m[1].replace(/,/g, "")) : null,
        };
      })
      .filter((o: any) => {
        if (seen.has(o.merchant)) return false;
        seen.add(o.merchant);
        return true;
      })
      .sort((a: any, b: any) => (a.price ?? Infinity) - (b.price ?? Infinity));

    return NextResponse.json({ offers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Search failed" }, { status: 500 });
  }
}