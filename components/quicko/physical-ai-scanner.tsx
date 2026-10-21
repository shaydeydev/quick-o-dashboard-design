"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { setCheckoutItem, type CheckoutItem } from "@/lib/checkout-store";
import { setScanPhase } from "@/lib/scan-store";
import { speak, stopSpeaking } from "@/lib/speak";
import { ProductCheckout } from "./product-checkout";

type Stage = "standby" | "camera" | "vision" | "pricing" | "success" | "error";

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

// High-contrast keyboard focus ring for every interactive element
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#12141c]";

export default function PhysicalAIScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage] = useState<Stage>("standby");
  const [product, setProduct] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [scanItem, setScanItem] = useState<CheckoutItem | null>(null);
  const [savings, setSavings] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [statusMsg, setStatusMsg] = useState("Camera is off.");

  // Keep the shared scan phase in sync (the 3D background will react to this)
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
      setStage("camera");
      setStatusMsg("Camera is live. Point it at a product and press Scan Item.");
    } catch (e: any) {
      const msg = e.message || "Could not access camera";
      setError(msg);
      setStatusMsg(`Camera error: ${msg}`);
      setStage("error");
    }
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const capture = (): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;
    const scale = Math.min(1, 800 / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const scan = async () => {
    setError(null);
    setOffers([]);
    setProduct(null);
    setScanItem(null);
    setSavings(0);
    setShowCheckout(false);
    setCheckoutItem(null);
    const image = capture();
    if (!image) {
      setError("Camera isn't ready yet");
      setStatusMsg("Camera isn't ready yet.");
      setStage("error");
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

  const toggleVoice = () => {
    setVoiceOn((v) => {
      if (v) stopSpeaking();
      return !v;
    });
  };

  const live = stage !== "standby" && stage !== "error";
  const busy = stage === "vision" || stage === "pricing";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#12141c]/70 p-3 backdrop-blur-xl sm:flex-row">
      {/* Screen-reader announcements for every stage */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMsg}
      </div>

      {/* Small camera preview */}
      <div className="relative aspect-video w-full shrink-0 self-start overflow-hidden rounded-xl bg-black sm:w-56">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Live camera preview"
          className="h-full w-full object-cover"
        />
        <canvas ref={canvasRef} aria-hidden="true" className="hidden" />
        <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
          {STAGE_LABEL[stage]}
        </span>
      </div>

      {/* Controls + results */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold tracking-tight text-white">Physical AI Scanner</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={voiceOn}
              aria-label={voiceOn ? "Turn voice feedback off" : "Turn voice feedback on"}
              className={`rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white hover:bg-white/10 ${focusRing}`}
            >
              {voiceOn ? "🔊 Voice on" : "🔇 Voice off"}
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
                  {busy ? "Scanning…" : "Scan Item"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
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

        {!product && !error && (
          <p className="text-xs text-slate-300">
            Point your camera at a product and hit Scan to identify it and find the lowest price.
          </p>
        )}

        {product && (
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

        {offers.length > 1 && !showCheckout && (
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
        {showCheckout && scanItem && (
          <ProductCheckout
            key={`${scanItem.title}-${scanItem.price}-${scanItem.merchant}`}
            item={scanItem}
            startOpen
          />
        )}
      </div>
    </div>
  );
}