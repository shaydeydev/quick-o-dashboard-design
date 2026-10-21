import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = process.env.NEBIUS_BASE_URL || "https://api.studio.nebius.com/v1";
const MODEL = process.env.NEBIUS_MODEL || "nvidia/Nemotron-3.5-Super-VL";

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
              {
                type: "text",
                text:
                  'Identify the main retail product in this image. Reply with ONLY a JSON object, no markdown, no explanation: {"name": string (brand + model if visible), "category": string, "estimated_price_usd": number}. If unsure, give your best guess.',
              },
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
    const product = extractJson(raw);
    return NextResponse.json({ product });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? "Vision failed" }, { status: 500 });
  }
}