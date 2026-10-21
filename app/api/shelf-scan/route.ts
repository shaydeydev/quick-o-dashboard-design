import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = process.env.NEBIUS_BASE_URL || "https://api.studio.nebius.com/v1";
const MODEL = process.env.NEBIUS_MODEL || "nvidia/Nemotron-3.5-Super-VL";

const PROMPT = [
  "This image shows a shelf, desk, or table with retail products.",
  "Identify each separate product you can clearly see, up to 6.",
  "Skip anything too blurry or cut off to identify.",
  "Reply with ONLY a JSON array, no markdown, no explanation.",
  "Each item is a FLAT object with no nested objects:",
  '{"name": string (brand + model if visible), "category": string, "estimated_price_usd": number,',
  '"box_x": number, "box_y": number, "box_w": number, "box_h": number}.',
  "The box tightly surrounds that product.",
  "box_x and box_y are the top-left corner. box_w and box_h are the size.",
  "All four box numbers are fractions of the image from 0 to 1.",
  "List each product once. If you see no products, reply with [].",
].join(" ");

// Collect every flat JSON object in the text that has a name
function extractItems(text: string): any[] {
  const cleaned = text.replace(/```json|```/g, "");
  const matches = cleaned.match(/\{[^{}]*\}/g) ?? [];
  const out: any[] = [];
  for (const m of matches) {
    try {
      const obj = JSON.parse(m);
      if (obj && obj.name) out.push(obj);
    } catch {}
  }
  return out;
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Safe 0..1 box, or null if the model gave nothing usable
function readBox(o: any) {
  const vals = [toNum(o.box_x), toNum(o.box_y), toNum(o.box_w), toNum(o.box_h)];
  if (vals.some((v) => Number.isNaN(v))) return null;

  // Some models answer in percent (0-100) or per-mille (0-1000)
  const max = Math.max(...vals);
  const scale = max > 1 ? (max <= 100 ? 100 : 1000) : 1;
  const [x0, y0, w0, h0] = vals.map((v) => v / scale);

  const x = clamp01(x0);
  const y = clamp01(y0);
  const w = Math.min(w0, 1 - x);
  const h = Math.min(h0, 1 - y);
  if (w < 0.04 || h < 0.04) return null;
  return { x, y, w, h };
}

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();
    if (typeof image !== "string" || !image.startsWith("data:image")) {
      return NextResponse.json({ error: "Expected a base64 data URL in `image`" }, { status: 400 });
    }
    if (!process.env.NEBIUS_API_KEY) {
      return NextResponse.json({ error: "NEBIUS_API_KEY missing" }, { status: 500 });
    }

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        max_tokens: 2000,
        chat_template_kwargs: { enable_thinking: false },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Shelf scan error", res.status, MODEL, detail);
      return NextResponse.json(
        { error: `Nebius ${res.status} (model: ${MODEL}): ${detail.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message ?? {};
    const raw = msg.content || msg.reasoning_content || msg.reasoning || "";
    console.log("Shelf raw response:", String(raw).slice(0, 1500));

    if (!String(raw).trim()) {
      return NextResponse.json({ error: "The model returned nothing. Try again." }, { status: 502 });
    }

    // Clean up, drop repeated names, cap at 6
    const seen = new Set<string>();
    const items: {
      name: string;
      category: string;
      estimated_price_usd: number;
      box: { x: number; y: number; w: number; h: number } | null;
    }[] = [];

    for (const o of extractItems(String(raw))) {
      const name = String(o.name).trim().slice(0, 80);
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const est = Number(String(o.estimated_price_usd).replace(/[^0-9.]/g, ""));
      items.push({
        name,
        category: String(o.category ?? "").trim().slice(0, 40),
        estimated_price_usd: Number.isFinite(est) && est > 0 && est < 100000 ? est : 0,
        box: readBox(o),
      });
      if (items.length >= 6) break;
    }

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? "Shelf scan failed" }, { status: 500 });
  }
}