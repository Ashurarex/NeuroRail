"use client";

/**
 * LiveCameraFeed
 * ──────────────────────────────────────────────────────────────────────────────
 * • Accesses device camera via navigator.mediaDevices.getUserMedia
 * • Streams video into a <video> element (autoplay, muted, responsive)
 * • Captures a 640×480 frame every INFER_INTERVAL_MS and POSTs to /detect
 * • Draws scaled bounding boxes on a transparent overlay canvas
 * • Shows SAFE / ALERT badge, FPS counter, and Start / Stop button
 * • Stream stays open on pause – no re-prompt needed on resume
 * • Full cleanup on unmount – no memory leaks
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { runDetect } from "@/lib/api/detect-service";
import type { DetectResponse } from "@/lib/api/detect-service";

// ── config ────────────────────────────────────────────────────────────────────

const CAPTURE_W       = 640;
const CAPTURE_H       = 480;
const INFER_INTERVAL_MS = 300;

// ── helpers ───────────────────────────────────────────────────────────────────

function confColor(conf: number) {
  if (conf >= 0.85) return "#ef4444";
  if (conf >= 0.60) return "#f59e0b";
  return "#10b981";
}

function paintOverlay(
  canvas: HTMLCanvasElement,
  detections: DetectResponse["detections"],
) {
  const dpr  = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;

  if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  if (!detections.length) return;

  const scaleX = cssW / CAPTURE_W;
  const scaleY = cssH / CAPTURE_H;

  for (const d of detections) {
    const x = d.bbox.x * scaleX;
    const y = d.bbox.y * scaleY;
    const w = d.bbox.w * scaleX;
    const h = d.bbox.h * scaleY;
    const color = confColor(d.confidence);

    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 6;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur  = 0;

    const label = `${d.label}  ${(d.confidence * 100).toFixed(0)}%`;
    ctx.font = "bold 12px Inter, sans-serif";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 22, tw + 12, 22);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x + 6, y - 7);
  }
}

function clearOverlay(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx?.clearRect(0, 0, canvas.width, canvas.height);
}

// ── types ─────────────────────────────────────────────────────────────────────

type CameraState = "booting" | "ready" | "denied" | "unavailable";

// ── component ─────────────────────────────────────────────────────────────────

export default function LiveCameraFeed() {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const overlayRef   = useRef<HTMLCanvasElement>(null);
  const captureRef   = useRef<HTMLCanvasElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const inferringRef = useRef(false);
  const frameCountRef = useRef(0);
  const alive        = useRef(true);

  const [camState,   setCamState]  = useState<CameraState>("booting");
  const [isRunning,  setIsRunning] = useState(false);
  const [result,     setResult]    = useState<DetectResponse | null>(null);
  const [fps,        setFps]       = useState(0);

  // ── inference loop ────────────────────────────────────────────────────────

  const inferOnce = useCallback(async () => {
    if (inferringRef.current) return;
    const video   = videoRef.current;
    const capture = captureRef.current;
    const overlay = overlayRef.current;
    if (!video || !capture || !overlay) return;
    if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;

    inferringRef.current = true;
    try {
      const ctx = capture.getContext("2d");
      if (!ctx) return;
      capture.width  = CAPTURE_W;
      capture.height = CAPTURE_H;
      ctx.drawImage(video, 0, 0, CAPTURE_W, CAPTURE_H);

      const blob = await new Promise<Blob | null>((res) =>
        capture.toBlob(res, "image/jpeg", 0.8),
      );
      if (!blob || !alive.current) return;

      const res = await runDetect(blob, "live-frame.jpg");
      if (!alive.current) return;

      setResult(res);
      paintOverlay(overlay, res.detections);
      frameCountRef.current++;
    } catch {
      // Skip failed frames silently
    } finally {
      inferringRef.current = false;
    }
  }, []);

  // ── start / stop helpers ──────────────────────────────────────────────────

  const startLoop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => void inferOnce(), INFER_INTERVAL_MS);

    if (fpsTimerRef.current) clearInterval(fpsTimerRef.current);
    fpsTimerRef.current = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);

    setIsRunning(true);
  }, [inferOnce]);

  const stopLoop = useCallback(() => {
    if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null; }
    if (fpsTimerRef.current){ clearInterval(fpsTimerRef.current); fpsTimerRef.current = null; }
    clearOverlay(overlayRef.current);
    setResult(null);
    setFps(0);
    setIsRunning(false);
  }, []);

  /** Toggle button handler – stream stays open, only inference pauses/resumes */
  const toggleRunning = useCallback(() => {
    if (isRunning) stopLoop(); else startLoop();
  }, [isRunning, startLoop, stopLoop]);

  // ── camera startup ────────────────────────────────────────────────────────

  useEffect(() => {
    alive.current = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" },
          audio: false,
        });

        if (!alive.current) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        if (!alive.current) return;
        setCamState("ready");
        startLoop();                    // auto-start inference on open

      } catch (err) {
        if (!alive.current) return;
        setCamState(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "denied"
            : "unavailable",
        );
      }
    }

    void startCamera();

    return () => {
      alive.current = false;
      stopLoop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty – startLoop/stopLoop stable, called imperatively

  // ── derived display values ────────────────────────────────────────────────

  const isAlert    = result?.alert_flag  ?? false;
  const alertLevel = result?.alert_level ?? "low";
  const confidence = result?.confidence  ?? 0;

  const levelStyle: Record<string, string> = {
    high:   "bg-red-500/90 border-red-400",
    medium: "bg-amber-500/90 border-amber-400",
    low:    "bg-emerald-600/90 border-emerald-500",
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-black"
      style={{ aspectRatio: "16/9" }}
    >
      {/* Hidden capture canvas */}
      <canvas ref={captureRef} className="hidden" aria-hidden />

      {/* Live video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Bounding-box overlay */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 h-full w-full pointer-events-none"
        aria-hidden
      />

      {/* ── badges (ready state) ────────────────────────────────────────── */}
      {camState === "ready" && (
        <>
          {/* SAFE / ALERT – top-left */}
          {isRunning && result && (
            <div className="absolute left-2 top-2">
              <span
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm ${levelStyle[alertLevel]}`}
              >
                {isAlert ? (
                  <><span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />⚠ ALERT</>
                ) : (
                  <><span className="h-1.5 w-1.5 rounded-full bg-white" />✓ SAFE</>
                )}
                <span className="opacity-80 ml-0.5">{(confidence * 100).toFixed(0)}%</span>
              </span>
            </div>
          )}

          {/* LIVE / PAUSED + FPS – top-right */}
          <div className="absolute right-2 top-2 flex items-center gap-1.5">
            {isRunning && fps > 0 && (
              <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-slate-300 backdrop-blur-sm">
                {fps} fps
              </span>
            )}
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm ${
                isRunning ? "bg-black/60" : "bg-slate-700/80"
              }`}
            >
              {isRunning ? (
                <><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />Live</>
              ) : (
                <><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Paused</>
              )}
            </span>
          </div>

          {/* Detection summary – bottom gradient bar */}
          {isRunning && result && result.detections.length > 0 && (
            <div className="absolute inset-x-0 bottom-9 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-3 pb-1 pt-5">
              <p className="text-[11px] text-white/80">
                {result.detections.length} object{result.detections.length !== 1 ? "s" : ""} detected
                {" · "}
                {result.detections.map((d) => d.label).join(", ")}
              </p>
            </div>
          )}

          {/* ── Start / Stop button – bottom bar ─────────────────────────── */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/50 backdrop-blur-sm py-1.5">
            <button
              id="live-camera-toggle-btn"
              onClick={toggleRunning}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-semibold transition-all active:scale-95 ${
                isRunning
                  ? "bg-red-500 hover:bg-red-400 text-white"
                  : "bg-emerald-500 hover:bg-emerald-400 text-white"
              }`}
            >
              {isRunning ? (
                /* Stop icon (square) */
                <><svg className="h-3 w-3" viewBox="0 0 10 10" fill="currentColor"><rect x="1.5" y="1.5" width="7" height="7" rx="1" /></svg>Stop</>
              ) : (
                /* Play icon (triangle) */
                <><svg className="h-3 w-3" viewBox="0 0 10 10" fill="currentColor"><polygon points="1.5,1 8.5,5 1.5,9" /></svg>Start</>
              )}
            </button>
          </div>
        </>
      )}

      {/* ── state overlays ──────────────────────────────────────────────── */}

      {camState === "booting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-xs text-slate-400">Starting camera…</p>
        </div>
      )}

      {camState === "denied" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 px-6 text-center">
          <span className="text-3xl">🚫</span>
          <p className="text-sm font-semibold text-white">Camera access denied</p>
          <p className="text-xs text-slate-400">Allow camera permissions in your browser settings and reload.</p>
        </div>
      )}

      {camState === "unavailable" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 px-6 text-center">
          <span className="text-3xl">📵</span>
          <p className="text-sm font-semibold text-white">No camera found</p>
          <p className="text-xs text-slate-400">Connect a camera device and reload the page.</p>
        </div>
      )}
    </div>
  );
}
