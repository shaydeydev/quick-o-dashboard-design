"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { setCheckoutItem, type CheckoutItem } from "@/lib/checkout-store";
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

export default function PhysicalAIScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage] = useState<Stage>("standby");
  const [product, setProduct] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [scanItem, setScanItem] = useState<CheckoutItem | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (e: any) {
      setError(e.message || "Could not access camera");
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
    setShowCheckout(false);
    setCheckoutItem(null);
    const image = capture();
    if (!image) {
      setError("Camera isn't ready yet");
      setStage("error");
      return;
    }
    try {
      setStage("vision");
      const vRes = await fetch("/api/nemotron-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const vData = await vRes.json();
      if (!vRes.ok) throw new Error(vData.error || "Vision failed");
      setProduct(vData.product);

      setStage("pricing");
      const tRes = await fetch("/api/tavily-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: vData.product.name }),
      });
      const tData = await tRes.json();
      if (!tRes.ok) throw new Error(tData.error || "Price search failed");
      setOffers(tData.offers);

      // Build the checkout item from the cheapest real offer (or the vision estimate)
      const bestOffer = tData.offers.find((o: any) => o.price);
      const item: CheckoutItem = {
        title: vData.product.name,
        price: bestOffer?.price ?? (Number(vData.product.estimated_price_usd) || 0),
        merchant: bestOffer?.merchant ?? "Estimated price",
        url: bestOffer?.url,
      };
      setScanItem(item);
      setCheckoutItem(item); // so "order that" in the chat works too
      setStage("success");
    } catch (e: any) {
      setError(e.message);
      setStage("error");
    }
  };

  const live = stage !== "standby" && stage !== "error";
  const busy = stage === "vision" || stage === "pricing";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#12141c]/70 p-3 backdrop-blur-xl sm:flex-row">
      {/* Small camera preview */}
      <div className="relative aspect-video w-full shrink-0 self-start overflow-hidden rounded-xl bg-black sm:w-56">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
          {STAGE_LABEL[stage]}
        </span>
      </div>

      {/* Controls + results */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold tracking-tight text-white">Physical AI Scanner</h2>
          <div className="flex gap-2">
            {!live ? (
              <button onClick={startCamera} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-black">
                Start Camera
              </button>
            ) : (
              <>
                <button
                  onClick={scan}
                  disabled={busy}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
                >
                  {busy ? "Scanning…" : "Scan Item"}
                </button>
                <button
                  onClick={() => { stopCamera(); setStage("standby"); }}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white"
                >
                  Stop
                </button>
              </>
            )}
          </div>
        </div>

        {error && <p className="line-clamp-2 text-xs text-red-400">{error}</p>}

        {!product && !error && (
          <p className="text-xs text-slate-400">
            Point your camera at a product and hit Scan to identify it and find the lowest price.
          </p>
        )}

        {product && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{product.name}</p>
              <p className="text-xs text-white/60">
                {product.category}
                {scanItem && scanItem.price > 0
                  ? ` · best $${scanItem.price.toFixed(2)} at ${scanItem.merchant}`
                  : ` · est. $${product.estimated_price_usd}`}
              </p>
            </div>
            {stage === "success" && scanItem && !showCheckout && (
              <button
                onClick={() => setShowCheckout(true)}
                className="rounded-lg bg-[#ffc439] px-3 py-1.5 text-xs font-semibold text-black"
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
                <a href={o.url} target="_blank" rel="noreferrer" className="underline">
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