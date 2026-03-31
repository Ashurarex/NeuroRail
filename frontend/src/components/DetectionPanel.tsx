"use client";

/**
 * DetectionPanel – full-featured detection UI component.
 * Drop onto any page: <DetectionPanel />
 *
 * Features:
 *  • Image upload / drag-and-drop
 *  • Live inference via POST /detect
 *  • SVG bounding-box overlay rendered on a canvas
 *  • Confidence badge + alert level badge
 *  • Live WebSocket alert feed (right column)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { runDetect, fetchModelStatus } from "@/lib/api/detect-service";
import type { DetectResponse, DetectionItem } from "@/lib/api/detect-service";
import { useAlertSocket } from "@/lib/use-alert-socket";
import type { WsAlert } from "@/lib/use-alert-socket";

// ── helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, string> = {
  high:   "bg-red-500/15 text-red-400 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const SEVERITY_DOT: Record<string, string> = {
  high:   "bg-red-500",
  medium: "bg-amber-400",
  low:    "bg-emerald-500",
};

function confidenceColor(conf: number): string {
  if (conf >= 0.85) return "#ef4444";
  if (conf >= 0.60) return "#f59e0b";
  return "#10b981";
}

// ── canvas overlay ────────────────────────────────────────────────────────────

function drawBoxes(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  detections: DetectionItem[],
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  for (const d of detections) {
    const { x, y, w, h } = d.bbox;
    const color = confidenceColor(d.confidence);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // label background
    ctx.fillStyle = color;
    const label = `${d.label} ${(d.confidence * 100).toFixed(1)}%`;
    ctx.font = "bold 14px Inter, sans-serif";
    const tw = ctx.measureText(label).width;
    ctx.fillRect(x, y - 22, tw + 10, 22);

    // label text
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x + 5, y - 6);
  }
}

// ── AlertFeed ─────────────────────────────────────────────────────────────────

function AlertFeed({ alerts, connected, onDismiss, onClearAll }: {
  alerts: WsAlert[];
  connected: boolean;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}) {
  return (
    <aside className="flex flex-col gap-3 min-w-0">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
            Live Alerts
          </h2>
        </div>
        {alerts.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* list */}
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[560px] pr-1">
        {alerts.length === 0 ? (
          <p className="text-xs text-zinc-600 italic mt-2">
            {connected ? "Listening for alerts…" : "Connecting to WebSocket…"}
          </p>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              className={`relative rounded-xl border px-4 py-3 text-sm transition-all ${SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES.low}`}
            >
              <button
                onClick={() => onDismiss(a.id)}
                aria-label="Dismiss alert"
                className="absolute top-2 right-3 text-current opacity-40 hover:opacity-100 transition-opacity text-lg leading-none"
              >
                ×
              </button>
              <div className="flex items-center gap-2 mb-1">
                <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[a.severity]}`} />
                <span className="font-semibold capitalize">{a.severity} — {a.data.object_type}</span>
              </div>
              <p className="text-xs opacity-80">{a.message}</p>
              <p className="text-xs opacity-50 mt-1">
                Confidence: {(a.data.confidence * 100).toFixed(1)}%
                &nbsp;·&nbsp;
                {new Date(a.data.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

// ── DetectionPanel (main export) ──────────────────────────────────────────────

export default function DetectionPanel() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<DetectResponse | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { alerts, connected, dismiss, clearAll } = useAlertSocket();

  // poll model status once on mount
  useEffect(() => {
    fetchModelStatus()
      .then((s) => setModelReady(s.model_ready))
      .catch(() => setModelReady(false));
  }, []);

  // re-draw boxes whenever result changes and image is loaded
  useEffect(() => {
    if (!result?.detections.length || !canvasRef.current || !imgRef.current) return;
    const img = imgRef.current;
    const draw = () => drawBoxes(canvasRef.current!, img, result.detections);
    if (img.complete) draw();
    else img.onload = draw;
  }, [result, imageDataUrl]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setResult(null);
    setPhase("idle");
    setErrorMsg("");
    const reader = new FileReader();
    reader.onload = (e) => setImageDataUrl(e.target?.result as string);
    reader.readAsDataURL(file);
    setImageBlob(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleAnalyze = useCallback(async () => {
    if (!imageBlob) return;
    setPhase("loading");
    setResult(null);
    try {
      const res = await runDetect(imageBlob);
      setResult(res);
      setPhase("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Detection failed.");
      setPhase("error");
    }
  }, [imageBlob]);

  return (
    <section className="min-h-screen bg-[#0b0f1a] text-white px-4 py-10 font-sans">
      {/* page header */}
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-indigo-400">Neural</span> Detection
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Upload a frame — NeuroRail ML will identify threats in real time.
            </p>
          </div>

          {/* model status pill */}
          <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold ${
            modelReady === null
              ? "border-zinc-700 text-zinc-500"
              : modelReady
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}>
            <span className={`h-2 w-2 rounded-full ${
              modelReady === null ? "bg-zinc-500" : modelReady ? "bg-emerald-400 animate-pulse" : "bg-red-400"
            }`} />
            {modelReady === null ? "Checking model…" : modelReady ? "Model Ready" : "Model Offline"}
          </div>
        </div>

        {/* two-column layout */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* LEFT – upload + canvas */}
          <div className="flex flex-col gap-4">

            {/* drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all select-none
                ${isDragging
                  ? "border-indigo-400 bg-indigo-500/10"
                  : "border-zinc-700 bg-zinc-900/60 hover:border-zinc-500 hover:bg-zinc-900"}`}
            >
              <input
                ref={fileInputRef}
                id="detect-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {imageDataUrl ? (
                <div className="relative w-full">
                  {/* hidden img used for natural dimensions */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img ref={imgRef} src={imageDataUrl} alt="Uploaded frame" className="hidden" />
                  <canvas
                    ref={canvasRef}
                    className="w-full rounded-xl object-contain"
                    style={{ maxHeight: 480 }}
                  />
                  <p className="mt-2 text-center text-xs text-zinc-600">Click to replace image</p>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-2xl">
                    🎯
                  </div>
                  <p className="text-sm font-medium text-zinc-300">
                    Drop an image or <span className="text-indigo-400 underline underline-offset-2">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">JPEG · PNG · WebP · max 20 MB</p>
                </>
              )}
            </div>

            {/* analyse button */}
            <button
              id="detect-analyze-btn"
              onClick={handleAnalyze}
              disabled={!imageBlob || phase === "loading"}
              className={`w-full rounded-xl py-3 text-sm font-semibold tracking-wide transition-all
                ${!imageBlob || phase === "loading"
                  ? "cursor-not-allowed bg-zinc-800 text-zinc-600"
                  : "bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-lg shadow-indigo-600/20"}`}
            >
              {phase === "loading" ? "Analysing…" : "Run Detection"}
            </button>

            {/* error banner */}
            {phase === "error" && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                {errorMsg}
              </div>
            )}

            {/* result card */}
            {phase === "success" && result && (
              <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900 p-5 space-y-4">
                {/* summary row */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${SEVERITY_STYLES[result.alert_level]}`}>
                    {result.alert_level.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400">Confidence</span>
                    <span className="text-lg font-bold"
                      style={{ color: confidenceColor(result.confidence) }}>
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <span className={`ml-auto text-xs ${result.alert_flag ? "text-red-400" : "text-zinc-500"}`}>
                    {result.alert_flag ? "⚠ Alert broadcast" : "No alert triggered"}
                  </span>
                </div>

                {/* confidence bar */}
                <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${result.confidence * 100}%`,
                      backgroundColor: confidenceColor(result.confidence),
                    }}
                  />
                </div>

                {/* detection table */}
                {result.detections.length > 0 ? (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-zinc-500 border-b border-zinc-700">
                        <th className="pb-2 pr-4 font-medium">Label</th>
                        <th className="pb-2 pr-4 font-medium">Confidence</th>
                        <th className="pb-2 font-medium">Bounding Box</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.detections.map((d, i) => (
                        <tr key={i} className="border-b border-zinc-800 last:border-none">
                          <td className="py-2 pr-4 font-semibold capitalize">{d.label}</td>
                          <td className="py-2 pr-4" style={{ color: confidenceColor(d.confidence) }}>
                            {(d.confidence * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 text-zinc-500 font-mono text-[10px]">
                            x{d.bbox.x.toFixed(0)} y{d.bbox.y.toFixed(0)} {d.bbox.w.toFixed(0)}×{d.bbox.h.toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-zinc-500">No objects detected above threshold.</p>
                )}

                <p className="text-xs text-zinc-600 pt-1">
                  Model: <span className="text-zinc-400">{result.model_type}</span>
                  &nbsp;·&nbsp;
                  {new Date(result.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT – live alert feed */}
          <AlertFeed
            alerts={alerts}
            connected={connected}
            onDismiss={dismiss}
            onClearAll={clearAll}
          />
        </div>
      </div>
    </section>
  );
}
