import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = process.env.NEBIUS_BASE_URL || "https://api.studio.nebius.com/v1";
const MODEL = process.env.NEBIUS_MODEL || "nvidia/Nemotron-3.5-Super-VL";

const PROMPT = [
  "Identify the main retail product in this image.",
  "Reply with ONLY a flat JSON object, no markdown, no explanation, no nested objects.",
  'Fields: {"name": string (brand + model if visible),',
  '"category": string,',
  '"estimated_price_usd": number,',
  '"box_x": number, "box_y": number, "box_w": number, "box_h": number}.',
  "The box tightly surrounds the product.",
  "box_x and box_y are the top-left corner. box_w and box_h are the size.",
  "All four box numbers are fractions of the image from 0 to 1.",
  "If unsure, give your best guess.",
].join(" ");

// Find the last small JSON object in the text that has a "name" field
function extractJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "");
  const matches = cleaned.match(/\{[^{}]*\}/g) ?? [];
  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(matches[i]);
      if (obj && obj.name) return obj;
    } catch {}
  }
  throw new Error("No JSON in model output: " + text.slice(0, 300));
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Turn whatever the model gave into a safe 0..1 box. Fall back to centered box.
function normalizeBox(obj: any) {
  const fallback = { box_x: 0.2, box_y: 0.15, box_w: 0.6, box_h: 0.7, box_found: false };
  const vals = [toNum(obj.box_x), toNum(obj.box_y), toNum(obj.box_w), toNum(obj.box_h)];
  if (vals.some((v) => Number.isNaN(v))) return fallback;

  // Some models answer in percent (0-100) or per-mille (0-1000)
  const max = Math.max(...vals);
  const scale = max > 1 ? (max <= 100 ? 100 : 1000) : 1;
  let [x, y, w, h] = vals.map((v) => v / scale);

  x = clamp01(x);
  y = clamp01(y);
  w = Math.min(w, 1 - x);
  h = Math.min(h, 1 - y);
  if (w < 0.05 || h < 0.05) return fallback;

  return { box_x: x, box_y: y, box_w: w, box_h: h, box_found: true };
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
      console.error("Nebius error", res.status, MODEL, detail);
      return NextResponse.json(
        { error: `Nebius ${res.status} (model: ${MODEL}): ${detail.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    console.log("Nebius raw response:", JSON.stringify(data.choices?.[0]?.message ?? data).slice(0, 1000));

    const msg = data.choices?.[0]?.message ?? {};
    const raw = msg.content || msg.reasoning_content || msg.reasoning || "";
    const obj = extractJson(raw);
    const product = { ...obj, ...normalizeBox(obj) };
    return NextResponse.json({ product });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? "Vision failed" }, { status: 500 });
  }
}