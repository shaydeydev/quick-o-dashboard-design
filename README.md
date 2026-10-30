# QuickO

**Point. Price. Pay.**

A free AI shopping agent that turns your camera into a price-matching tool, and keeps your subscriptions inside your budget.

Built for the Nebius x NVIDIA Global AI Hackathon 2026.

[Live demo](https://quick-o-dashboard-design.vercel.app) | Demo video: linked in the Devpost submission

## What it does now

Open the app, allow the camera, and point it at a product or a shelf. The Next.js app:

- Identifies a single product, or up to 6 items on a shelf, from one camera frame using NVIDIA Nemotron 3.5 Super VL served through Nebius Token Factory. The model returns a name, category, rough price and where the item sits in the frame.
- Draws boxes and price badges over the live video. Positions are approximate and fade when the camera moves.
- Compares live prices across Amazon, eBay, Target, Walmart and Best Buy using Tavily web search, highlights the cheapest offer, and drops prices that look like outliers.
- Checks out with PayPal (sandbox): one item, or every ticked item on a shelf in a single payment.
- Speaks the best deal out loud when voice is switched on. Voice and auto-scan are both off by default.
- Auto-scans when the camera holds still (opt-in), and shows a "Hold steady..." progress bar while it waits.
- Runs a shopping-only chat agent. Voice-to-text works in Chrome, Edge and Safari. Commands like "pause Spotify" or "pause everything" update the Subscription Priority Guard directly, before any AI call.
- Ranks subscriptions by priority (drag and drop) against a 30 USD PayPal sandbox balance. When the total goes over, "Pause lowest priority" pauses from the bottom up until it fits. New subscriptions can be added with the + button.
- Keeps a session savings counter and an orders list.

Prices come from live web search, so they are leads, not guarantees. Check the merchant page before you buy.

## Key facts

| Setting | Value | Notes |
|---|---|---|
| Stores compared | 5 | Amazon, eBay, Target, Walmart, Best Buy, searched in parallel |
| Shelf mode | up to 6 items per scan | Priced in parallel, paid in one PayPal checkout |
| Auto-scan | 32x18 grayscale frame every 250 ms | Scans after the camera holds still for 1.5 s |
| Price sanity filter | drops prices outside 0.4x to 2.5x the median | Items still flagged "Price looks off" if far from the model's estimate |
| Capture size | 800 px wide (single), 1280 px wide (shelf) | JPEG quality 0.8 |
| Budget | 30 USD | PayPal sandbox balance the Guard protects |

We did not run a formal accuracy benchmark, so there are no accuracy numbers here. See Limitations below.

## How it works

```
camera frame
  -> /api/nemotron-vision or /api/shelf-scan   Nemotron VL on Nebius: name, category, rough price, box
  -> /api/tavily-search or /api/arbitrage      Tavily live search: offers per store
  -> price sanity filter -> cheapest offer
  -> PayPal sandbox checkout (one item, or a whole shelf in one payment)

chat message
  -> pause / resume commands are handled in the browser, before any AI call
  -> everything else: /api/agent (shopping-only guardrail gate, then Nemotron + Tavily tool call,
     then a structured answer with a checkout card)
```

The vision routes ask the model for flat JSON (no nested objects) and normalize box coordinates that arrive as 0-1, 0-100 or 0-1000 values.

## Demo

1. Skip or watch the short intro.
2. Turn voice on, point the camera at a branded product (headphones, a mouse). Boxes lock on, price badges appear, and the best deal is spoken.
3. Check the five-store panel, then pay with PayPal sandbox. The savings counter updates.
4. Switch to Shelf mode, scan a few branded items, tick them, and pay once.
5. In the Subscription Guard, add a subscription with + so the total goes over 30 USD, then press "Pause lowest priority".
6. In the chat, say "pause Spotify" and watch the Guard change.

Branded products work best. Generic items (a plain mug) usually get no verified price.

## Run locally

Requires Node.js 20+ and a modern browser. The camera needs localhost or HTTPS.

```
git clone https://github.com/shaydeydev/quick-o-dashboard-design.git
cd quick-o-dashboard-design
npm install
```

Create your environment file from the template, then fill in your own keys:

```
# macOS / Linux
cp .env.example .env.local

# Windows PowerShell
Copy-Item .env.example .env.local
```

| Variable | Required | What it is |
|---|---|---|
| `NEBIUS_API_KEY` | yes | Nebius Token Factory API key |
| `TAVILY_API_KEY` | yes | Tavily search API key |
| `NEBIUS_MODEL` | recommended | Vision-language model id, `nvidia/Nemotron-3.5-Super-VL` |
| `NEBIUS_BASE_URL` | optional | Overrides the OpenAI-compatible Nebius base URL used by the vision routes |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | for checkout | PayPal sandbox client id (falls back to "test") |

Never commit `.env.local`. Then:

```
npm run dev
```

Open http://localhost:3000. Use a PayPal sandbox buyer account to complete a test payment.

Type-check and production build:

```
npm run build
```

### Deploy on Vercel

`.env.local` is not uploaded. Add the same variable names in the Vercel project settings, then redeploy. If you want the site public, make sure deployment protection is off for the domain you share.

## Project layout

```
app/page.tsx                                dashboard layout
app/api/nemotron-vision/route.ts            single-item vision call
app/api/shelf-scan/route.ts                 shelf mode: up to 6 items with boxes
app/api/tavily-search/route.ts              live offers for one product
app/api/arbitrage/route.ts                  per-store search (five stores)
app/api/agent/route.ts                      chat agent: guardrail gate, tool call, structured answer
components/quicko/physical-ai-scanner.tsx   camera, auto-scan, overlay, single and shelf modes
components/quicko/shelf-results.tsx         shelf checklist and one-payment checkout
components/quicko/product-checkout.tsx      checkout card
components/quicko/paypal-button.tsx         PayPal sandbox button
components/quicko/agent-prompt.tsx          chat, voice input, subscription commands
components/quicko/subscription-guard.tsx    priority ranking and budget guard
components/quicko/add-subscription-dialog.tsx
components/quicko/price-match.tsx           five-store comparison panel
components/Interactive3DBackground.tsx      scan-reactive particle background
components/IntroOverlay.tsx                 animated intro
lib/*-store.ts                              small shared stores: checkout, orders, subscriptions, scan phase, savings, AR
lib/shelf.ts                                shelf pricing and price sanity filter
lib/speak.ts                                text-to-speech helper
```

## Accessibility

Opt-in voice announcements of results, `aria-live` status messages for scanner stages, visible focus rings, Escape to close dialogs, and reduced-motion support in the intro and the 3D background.

## Limitations and ethics

- **Prices can be wrong or missing.** They are extracted from search-result text. Amazon often hides prices. The outlier filter, the "Price looks off" flag, and excluding unverified items from shelf checkout reduce the risk but do not remove it.
- **The overlay is approximate.** Box positions come from the vision model and only match at scan time. The "AR" view is an HTML overlay on the video, not WebXR.
- **Generic items rarely get a verified price.** Branded products work best.
- **The model cannot prove authenticity** or read small serial numbers.
- **PayPal runs in sandbox.** No real money moves. Pausing a subscription is a simulation and is not linked to any real service.
- **State lives in memory.** Orders, added subscriptions and savings reset when the page reloads.
- **Cost.** One shelf scan is 1 vision call plus up to 6 searches, which is why auto-scan is off by default.
- **Voice input** needs Chrome, Edge or Safari and microphone permission.


## License

MIT. See [LICENSE](LICENSE).