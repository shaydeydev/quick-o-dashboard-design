"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Stage = "standby" | "camera" | "vision" | "pricing" | "success" | "error";

const STAGE_LABEL: Record<Stage, string> = {
  standby: "Camera Standby",
  camera: "Camera Live",
  vision: "Nemotron Vision Analysis…",
  pricing: "Tavily Price Matching…",
  success: "Success",
  error: "Error",
};

export default function PhysicalAIScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage] = useState<Stage>("standby");
  const [product, setProduct] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
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
    const scale = Math.min(1, 800 / video.videoWidth); // keep payload small
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const scan = async () => {
    setError(null);
    setOffers([]);
    setProduct(null);
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
      setStage("success");
    } catch (e: any) {
      setError(e.message);
      setStage("error");
    }
  };

  const live = stage !== "standby" && stage !== "error";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
        {/* Always mounted so the ref exists when the stream attaches */}
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-white">
          {STAGE_LABEL[stage]}
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        {!live ? (
          <button onClick={startCamera} className="rounded bg-emerald-500 px-4 py-2 text-black">
            Start Camera
          </button>
        ) : (
          <>
            <button
              onClick={scan}
              disabled={stage === "vision" || stage === "pricing"}
              className="rounded bg-emerald-500 px-4 py-2 text-black disabled:opacity-50"
            >
              Scan Item
            </button>
            <button
              onClick={() => { stopCamera(); setStage("standby"); }}
              className="rounded border border-white/20 px-4 py-2 text-white"
            >
              Stop
            </button>
          </>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {product && (
        <div className="mt-3 text-white">
          <p className="font-semibold">{product.name}</p>
          <p className="text-sm text-white/60">
            {product.category} · est. ${product.estimated_price_usd}
          </p>
        </div>
      )}

      {offers.length > 0 && (
        <ul className="mt-3 space-y-2">
          {offers.map((o) => (
            <li key={o.url} className="flex items-center justify-between text-sm text-white">
              <a href={o.url} target="_blank" rel="noreferrer" className="underline">
                {o.merchant}
              </a>
              <span>{o.price ? `$${o.price.toFixed(2)}` : "see site"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}