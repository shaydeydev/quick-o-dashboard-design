"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { setCheckoutItem, type CheckoutItem } from "@/lib/checkout-store";
import { setScanPhase } from "@/lib/scan-store";
import { speak, stopSpeaking } from "@/lib/speak";
import { setArExpanded, useArExpanded } from "@/lib/ar-store";
import { priceShelfItems, toShelfItems, type ShelfItem } from "@/lib/shelf";
import { ProductCheckout } from "./product-checkout";
import { ShelfResults } from "./shelf-results";

type Stage = "standby" | "camera" | "vision" | "pricing" | "success" | "error";
type Mode = "single" | "shelf";

type Box = { x: number; y: number; w: number; h: number; found: boolean };

const STAGE_LABEL: Record<Stage, string> = {
  standby: "Standby",
  camera: "Live",
  vision: "Nemotron analyzing…",
  pricing: "Matching prices…",
  success: "Done",
  error: "Error",
};

const STAGE_TO_PHASE = {
  standby: "idle",
  camera: "live",
  vision: "analyzing",
  pricing: "pricing",
  success: "found",
  error: "error",
} as const;

// Auto-scan tuning
const TICK_MS = 250; // how often we look at the camera
const HOLD_MS = 1500; // how long to hold steady before auto scan
const STEADY_DIFF = 4; // below this = camera is still
const MOVE_DIFF = 12; // above this = camera is moving
const MW = 32; // tiny frame size used only to detect motion
const MH = 18;

// High-contrast keyboard focus ring for every interactive element
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#12141c]";

function shelfBoxClass(status: ShelfItem["status"]) {
  if (status === "pending")
    return "border-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.7)] motion-safe:animate-pulse";
  if (status === "priced") return "border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]";
  return "border-white/60";
}

export default function PhysicalAIScanner() {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-scan bookkeeping (refs so the timer always sees fresh values)
  const prevFrameRef = useRef<Uint8Array | null>(null);
  const steadyMsRef = useRef(0);
  const movingFramesRef = useRef(0);
  const armedRef = useRef(true);
  const scanRef = useRef<() => void>(() => {});

  // Lets a newer scan (or Stop) cancel older shelf price lookups
  const scanIdRef = useRef(0);
  const stageRef = useRef<Stage>("standby");
  const prevExpandedRef = useRef(false);

  const expanded = useArExpanded();

  const [stage, setStage] = useState<Stage>("standby");
  const [mode, setMode] = useState<Mode>("single");
  const [product, setProduct] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [scanItem, setScanItem] = useState<CheckoutItem | null>(null);
  const [savings, setSavings] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [shelfItems, setShelfItems] = useState<ShelfItem[]>([]);
  const [shelfScanId, setShelfScanId] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(false); // off by default
  const [autoScan, setAutoScan] = useState(false); // off by default
  const [hold, setHold] = useState(0); // 0..1 progress of "hold steady"
  const [box, setBox] = useState<Box | null>(null);
  const [overlayOn, setOverlayOn] = useState(true);
  const [statusMsg, setStatusMsg] = useState("Camera is off.");

  stageRef.current = stage;

  const live = stage !== "standby" && stage !== "error";
  const busy = stage === "vision" || stage === "pricing";

  // Keep the shared scan phase in sync (the 3D background reacts to this)
  useEffect(() => {
    setScanPhase(STAGE_TO_PHASE[stage]);
  }, [stage]);

  useEffect(() => {
    return () => {
      setScanPhase("idle");
      stopSpeaking();
    };
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      armedRef.current = true;
      setStage("camera");
      setStatusMsg("Camera is live. Point it at a product and press Scan.");
    } catch (e: any) {
      const msg = e.message || "Could not access camera";
      setError(msg);
      setStatusMsg(`Camera error: ${msg}`);
      setStage("error");
    }
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  // AR button / Expand: scroll the scanner into view and start the camera if it is off
  useEffect(() => {
    if (expanded && !prevExpandedRef.current) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      rootRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      if (stageRef.current === "standby") {
        void startCamera();
      } else {
        setStatusMsg("Scanner enlarged.");
      }
    } else if (!expanded && prevExpandedRef.current) {
      setStatusMsg("Scanner back to normal size.");
    }
    prevExpandedRef.current = expanded;
  }, [expanded, startCamera]);

  const capture = (maxWidth: number): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const resetResults = () => {
    setError(null);
    setNotice("");
    setOffers([]);
    setProduct(null);
    setScanItem(null);
    setSavings(0);
    setShowCheckout(false);
    setBox(null);
    setShelfItems([]);
    setOverlayOn(true);
  };

  // ---------- Shelf mode: many products, one payment ----------
  const scanShelf = async (image: string, myScan: number) => {
    try {
      setStage("vision");
      setStatusMsg("Looking at the shelf…");
      const res = await fetch("/api/shelf-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Shelf scan failed");
      if (myScan !== scanIdRef.current) return;

      const items = toShelfItems(data.items ?? []);
      if (items.length === 0) {
        const msg = "No products found. Move closer, add light, and try again.";
        setNotice(msg);
        setStatusMsg(msg);
        setStage("camera");
        return;
      }

      setShelfItems(items);
      setShelfScanId(myScan);
      setStage("pricing");
      setStatusMsg(`Found ${items.length} products. Looking up prices…`);

      let local = items;
      await priceShelfItems(
        items,
        (id, patch) => {
          local = local.map((it) => (it.id === id ? { ...it, ...patch } : it));
          setShelfItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
        },
        () => myScan !== scanIdRef.current,
      );
      if (myScan !== scanIdRef.current) return;

      setStage("success");
      const priced = local.filter((it) => it.status === "priced");
      const total = priced.reduce((sum, it) => sum + it.price, 0);
      const msg =
        priced.length > 0
          ? `Found ${local.length} products. ${priced.length} priced, ${total.toFixed(2)} dollars in total.`
          : `Found ${local.length} products, but no verified prices.`;
      setStatusMsg(msg);
      if (voiceOn) speak(msg);
    } catch (e: any) {
      if (myScan !== scanIdRef.current) return;
      setError(e.message);
      setStatusMsg(`Scan failed: ${e.message}`);
      setStage("error");
      if (voiceOn) speak("Scan failed. Please try again.");
    }
  };

  const scan = async () => {
    armedRef.current = false; // need camera movement before the next auto scan
    steadyMsRef.current = 0;
    setHold(0);
    const myScan = ++scanIdRef.current;
    resetResults();
    setCheckoutItem(null);

    const image = capture(mode === "shelf" ? 1280 : 800);
    if (!image) {
      setError("Camera isn't ready yet");
      setStatusMsg("Camera isn't ready yet.");
      setStage("error");
      return;
    }

    if (mode === "shelf") {
      await scanShelf(image, myScan);
      return;
    }

    try {
      setStage("vision");
      setStatusMsg("Analyzing image…");
      const vRes = await fetch("/api/nemotron-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const vData = await vRes.json();
      if (!vRes.ok) throw new Error(vData.error || "Vision failed");
      setProduct(vData.product);
      setBox({
        x: Number(vData.product.box_x) || 0.2,
        y: Number(vData.product.box_y) || 0.15,
        w: Number(vData.product.box_w) || 0.6,
        h: Number(vData.product.box_h) || 0.7,
        found: Boolean(vData.product.box_found),
      });

      setStage("pricing");
      setStatusMsg(`Identified ${vData.product.name}. Searching for the lowest price…`);
      const tRes = await fetch("/api/tavily-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: vData.product.name }),
      });
      const tData = await tRes.json();
      if (!tRes.ok) throw new Error(tData.error || "Price search failed");
      setOffers(tData.offers);

      // Build the checkout item from the cheapest real offer (or the vision estimate)
      const priced = tData.offers.filter((o: any) => o.price);
      const bestOffer = priced[0];
      const item: CheckoutItem = {
        title: vData.product.name,
        price: bestOffer?.price ?? (Number(vData.product.estimated_price_usd) || 0),
        merchant: bestOffer?.merchant ?? "Estimated price",
        url: bestOffer?.url,
      };

      // How much cheaper is the best offer than the most expensive one found?
      let saved = 0;
      if (priced.length > 1) {
        const prices = priced.map((o: any) => o.price as number);
        saved = Math.max(...prices) - Math.min(...prices);
      }
      setSavings(saved);

      setScanItem(item);
      setCheckoutItem(item); // so "order that" in the chat works too
      setStage("success");

      const priceText = item.price > 0 ? `$${item.price.toFixed(2)}` : "no verified price";
      const msg =
        item.price > 0
          ? `Price found: ${priceText} at ${item.merchant} for ${item.title}.${
              saved > 0 ? ` That saves you $${saved.toFixed(2)} compared to the highest listing.` : ""
            }`
          : `Identified ${item.title}, but no verified price was found.`;
      setStatusMsg(msg);
      if (voiceOn) speak(msg);
    } catch (e: any) {
      setError(e.message);
      setStatusMsg(`Scan failed: ${e.message}`);
      setStage("error");
      if (voiceOn) speak("Scan failed. Please try again.");
    }
  };

  // Always point the timer at the newest scan function
  scanRef.current = scan;

  // Watch the camera: hold steady = auto scan, move = hide old overlay and re-arm
  useEffect(() => {
    if (stage !== "camera" && stage !== "success") return;

    const id = window.setInterval(() => {
      const video = videoRef.current;
      const c = motionCanvasRef.current;
      if (!video || !c || !video.videoWidth) return;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, MW, MH);
      const d = ctx.getImageData(0, 0, MW, MH).data;
      const cur = new Uint8Array(MW * MH);
      for (let i = 0; i < cur.length; i++) {
        cur[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
      }
      const prev = prevFrameRef.current;
      prevFrameRef.current = cur;
      if (!prev) return;

      let sum = 0;
      for (let i = 0; i < cur.length; i++) sum += Math.abs(cur[i] - prev[i]);
      const diff = sum / cur.length;

      if (diff > MOVE_DIFF) {
        steadyMsRef.current = 0;
        setHold(0);
        movingFramesRef.current += 1;
        if (movingFramesRef.current >= 2) {
          armedRef.current = true;
          setOverlayOn(false); // old boxes no longer match the picture
        }
        return;
      }
      movingFramesRef.current = 0;

      if (diff < STEADY_DIFF) steadyMsRef.current += TICK_MS;
      else steadyMsRef.current = 0;

      if (autoScan && armedRef.current) {
        setHold(Math.min(1, steadyMsRef.current / HOLD_MS));
        if (steadyMsRef.current >= HOLD_MS) {
          armedRef.current = false;
          steadyMsRef.current = 0;
          setHold(0);
          scanRef.current();
        }
      } else {
        setHold(0);
      }
    }, TICK_MS);

    return () => {
      window.clearInterval(id);
      prevFrameRef.current = null;
      steadyMsRef.current = 0;
      movingFramesRef.current = 0;
      setHold(0);
    };
  }, [stage, autoScan]);

  const toggleVoice = () => {
    setVoiceOn((v) => {
      if (v) stopSpeaking();
      return !v;
    });
  };

  const changeMode = (next: Mode) => {
    if (next === mode || busy) return;
    scanIdRef.current += 1;
    resetResults();
    setMode(next);
    if (stage === "success") setStage("camera");
    setStatusMsg(
      next === "shelf"
        ? "Shelf mode. Show several products and press Scan Shelf."
        : "Single item mode. Point at one product and press Scan Item.",
    );
  };

  // Cheapest few priced offers become floating badges (single mode)
  const badges = offers.filter((o) => o.price).slice(0, 3);

  // Box color follows the scan stage (single mode)
  const boxColor =
    stage === "vision"
      ? "border-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.7)]"
      : stage === "pricing"
      ? "border-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.7)]"
      : "border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.7)]";

  const showGuide = live && mode === "single" && !box && (stage === "camera" || stage === "vision");
  const showBox = live && mode === "single" && box && overlayOn && stage !== "camera";
  const showShelfWait = live && mode === "shelf" && stage === "vision";
  const showShelfBoxes =
    live && mode === "shelf" && overlayOn && (stage === "pricing" || stage === "success");

  const scanLabel = mode === "shelf" ? "Scan Shelf" : "Scan Item";

  return (
    <div
      ref={rootRef}
      onKeyDown={(e) => {
        if (e.key === "Escape" && expanded) setArExpanded(false);
      }}
      className={`flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#12141c]/70 p-3 backdrop-blur-xl ${
        expanded ? "" : "sm:flex-row"
      }`}
    >
      {/* Screen-reader announcements for every stage */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMsg}
      </div>

      {/* Camera preview with fake-AR overlay */}
      <div
        className={`relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-black ${
          expanded ? "max-w-4xl self-center" : "self-start sm:w-72"
        }`}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Live camera preview"
          className="h-full w-full object-cover"
        />
        <canvas ref={canvasRef} aria-hidden="true" className="hidden" />
        <canvas
          ref={motionCanvasRef}
          width={MW}
          height={MH}
          aria-hidden="true"
          className="hidden"
        />

        {/* Overlay is decoration only. Screen readers get the status message above. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {/* Center guide before the model gives a box */}
          {showGuide && (
            <div
              className={`absolute left-[20%] top-[15%] h-[70%] w-[60%] rounded-lg border-2 border-dashed ${
                stage === "vision"
                  ? "border-cyan-300 motion-safe:animate-pulse"
                  : "border-white/50"
              }`}
            />
          )}

          {/* Shelf mode: whole frame pulses while the model looks */}
          {showShelfWait && (
            <div className="absolute inset-2 rounded-lg border-2 border-dashed border-cyan-300 motion-safe:animate-pulse" />
          )}

          {/* Single mode: box that locks on the product */}
          {showBox && box && (
            <div
              className={`absolute rounded-md border-2 transition-all duration-300 ${boxColor} ${
                stage === "pricing" ? "motion-safe:animate-pulse" : ""
              }`}
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.w * 100}%`,
                height: `${box.h * 100}%`,
              }}
            >
              {product?.name && (
                <span className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {product.name}
                </span>
              )}

              {/* Floating price badges */}
              {stage === "success" && badges.length > 0 && (
                <div className="absolute right-1 top-1 flex flex-col items-end gap-1">
                  {badges.map((o, i) => (
                    <span
                      key={o.url}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow ${
                        i === 0
                          ? "bg-emerald-400 text-black"
                          : "bg-black/75 text-white"
                      }`}
                    >
                      {o.merchant} ${o.price.toFixed(2)}
                    </span>
                  ))}
                </div>
              )}

              {!box.found && (
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white/80">
                  approx. position
                </span>
              )}
            </div>
          )}

          {/* Shelf mode: numbered boxes, price shows when it lands */}
          {showShelfBoxes &&
            shelfItems.map(
              (it, i) =>
                it.box && (
                  <div
                    key={it.id}
                    className={`absolute rounded-md border-2 transition-all duration-300 ${shelfBoxClass(it.status)}`}
                    style={{
                      left: `${it.box.x * 100}%`,
                      top: `${it.box.y * 100}%`,
                      width: `${it.box.w * 100}%`,
                      height: `${it.box.h * 100}%`,
                    }}
                  >
                    <span className="absolute left-0 top-0 rounded-br bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    {it.status === "priced" && (
                      <span className="absolute bottom-1 right-1 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-bold text-black shadow">
                        ${it.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                ),
            )}

          {/* Hold-steady progress */}
          {hold > 0 && (
            <div className="absolute inset-x-3 bottom-2">
              <p className="mb-1 text-center text-[10px] font-semibold text-white drop-shadow">
                Hold steady…
              </p>
              <div className="h-1 overflow-hidden rounded bg-white/25">
                <div
                  className="h-full bg-emerald-400"
                  style={{ width: `${hold * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
          {STAGE_LABEL[stage]}
        </span>
      </div>

      {/* Controls + results */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold tracking-tight text-white">Physical AI Scanner</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Scan mode"
              className="flex rounded-lg border border-white/30 p-0.5"
            >
              {(["single", "shelf"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => changeMode(m)}
                  disabled={busy}
                  aria-pressed={mode === m}
                  className={`rounded-md px-2.5 py-1 text-xs text-white disabled:opacity-60 ${focusRing} ${
                    mode === m ? "bg-white/25 font-semibold" : "hover:bg-white/10"
                  }`}
                >
                  {m === "single" ? "Single item" : "Shelf"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={voiceOn}
              aria-label={voiceOn ? "Turn voice feedback off" : "Turn voice feedback on"}
              className={`rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white hover:bg-white/10 ${focusRing}`}
            >
              {voiceOn ? "🔊 Voice on" : "🔇 Voice off"}
            </button>
            <button
              type="button"
              onClick={() => setAutoScan((a) => !a)}
              aria-pressed={autoScan}
              aria-label={
                autoScan
                  ? "Turn auto scan off. Auto scan starts a scan when the camera is held steady."
                  : "Turn auto scan on. Auto scan starts a scan when the camera is held steady."
              }
              className={`rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white hover:bg-white/10 ${focusRing}`}
            >
              {autoScan ? "🎯 Auto-scan on" : "🎯 Auto-scan off"}
            </button>
            <button
              type="button"
              onClick={() => setArExpanded(!expanded)}
              aria-pressed={expanded}
              aria-label="Big scanner view"
              className={`flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white hover:bg-white/10 ${focusRing}`}
            >
              {expanded ? (
                <Minimize2 className="size-3.5" aria-hidden="true" />
              ) : (
                <Maximize2 className="size-3.5" aria-hidden="true" />
              )}
              {expanded ? "Make smaller" : "Expand"}
            </button>
            {!live ? (
              <button
                type="button"
                onClick={startCamera}
                className={`rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black ${focusRing}`}
              >
                Start Camera
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={scan}
                  disabled={busy}
                  className={`rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50 ${focusRing}`}
                >
                  {busy ? "Scanning…" : scanLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    scanIdRef.current += 1; // cancel any price lookups still running
                    stopCamera();
                    setBox(null);
                    setShelfItems([]);
                    setNotice("");
                    setStage("standby");
                    setStatusMsg("Camera is off.");
                  }}
                  className={`rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white hover:bg-white/10 ${focusRing}`}
                >
                  Stop
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="line-clamp-2 text-xs text-red-400">
            {error}
          </p>
        )}

        {notice && !error && <p className="text-xs text-amber-300">{notice}</p>}

        {!product && shelfItems.length === 0 && !error && !notice && (
          <p className="text-xs text-slate-300">
            {mode === "shelf"
              ? autoScan
                ? "Show a shelf with several products and hold steady. It finds each one and prices it."
                : "Show a shelf with several products and hit Scan Shelf. Turn on Auto-scan to scan hands-free."
              : autoScan
              ? "Point your camera at a product and hold steady. It scans by itself, or hit Scan Item."
              : "Point your camera at a product and hit Scan Item. Turn on Auto-scan to scan hands-free."}
          </p>
        )}

        {/* Shelf mode results: list, one payment for everything ticked */}
        {mode === "shelf" && shelfItems.length > 0 && (
          <ShelfResults key={shelfScanId} items={shelfItems} />
        )}

        {mode === "single" && product && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{product.name}</p>
              <p className="text-xs text-white/70">
                {product.category}
                {scanItem && scanItem.price > 0
                  ? ` · best $${scanItem.price.toFixed(2)} at ${scanItem.merchant}`
                  : ` · est. $${product.estimated_price_usd}`}
              </p>
              {savings > 0 && (
                <span className="mt-1 inline-block rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  Save ${savings.toFixed(2)} vs highest
                </span>
              )}
            </div>
            {stage === "success" && scanItem && !showCheckout && (
              <button
                type="button"
                onClick={() => setShowCheckout(true)}
                className={`rounded-lg bg-[#ffc439] px-3 py-1.5 text-xs font-semibold text-black ${focusRing}`}
              >
                One-click checkout
              </button>
            )}
          </div>
        )}

        {mode === "single" && offers.length > 1 && !showCheckout && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/80">
            {offers.slice(0, 4).map((o) => (
              <li key={o.url}>
                <a
                  href={o.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded underline ${focusRing}`}
                >
                  {o.merchant}
                </a>{" "}
                {o.price ? `$${o.price.toFixed(2)}` : ""}
              </li>
            ))}
          </ul>
        )}

        {/* PayPal opens right here for the scanned product */}
        {mode === "single" && showCheckout && scanItem && (
          <ProductCheckout
            key={`${scanItem.title}-${scanItem.price}-${scanItem.merchant}`}
            item={scanItem}
            startOpen
            savings={savings}
          />
        )}
      </div>
    </div>
  );
}