"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { fetchAdminLiveSummary } from "@/lib/api/admin-service";
import type { AdminLiveSummary } from "@/lib/api/types";
import { runDetect, fetchModelStatus } from "@/lib/api/detect-service";
import type { DetectResponse, DetectionItem } from "@/lib/api/detect-service";
import { useAlertSocket } from "@/lib/use-alert-socket";
import type { WsAlert } from "@/lib/use-alert-socket";
import LiveCameraFeed from "@/components/LiveCameraFeed";

// ── types ──────────────────────────────────────────────────────────────────────

/** A single upload-detection result stored for the Alerts panel */
type UploadAlert = {
  id: string;
  result: DetectResponse;
  filename: string;
};

// ── constants ─────────────────────────────────────────────────────────────────

const cameraGroups = ["Platform", "Concourse", "Entrances", "Staff zones"];

// ── helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_BG: Record<string, string> = {
  high:   "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low:    "bg-emerald-50 text-emerald-700 border-emerald-200",
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

function drawBoxes(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  detections: DetectionItem[],
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  for (const d of detections) {
    const { x, y, w, h } = d.bbox;
    const color = confidenceColor(d.confidence);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 3;
    ctx.strokeRect(x, y, w, h);
    const label = `${d.label} ${(d.confidence * 100).toFixed(1)}%`;
    ctx.font = "bold 13px Inter, sans-serif";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 22, tw + 10, 22);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x + 5, y - 6);
  }
}

// ── sub-components ────────────────────────────────────────────────────────────

/**
 * Panel header shared by both feeds.
 */
function FeedHeader({
  dot,
  label,
  count,
  onClear,
}: {
  dot: React.ReactNode;
  label: string;
  count: number;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-line">
      <div className="flex items-center gap-2">
        {dot}
        <span className="text-xs font-semibold uppercase tracking-widest text-muted">
          {label}
        </span>
      </div>
      {count > 0 && (
        <button
          onClick={onClear}
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. Camera Live Alerts — driven by WebSocket
// ──────────────────────────────────────────────────────────────────────────────
function CameraAlertFeed({
  alerts,
  connected,
  onDismiss,
  onClearAll,
}: {
  alerts: WsAlert[];
  connected: boolean;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}) {
  return (
    <aside className="flex flex-col rounded-xl border border-line bg-surface p-4">
      <FeedHeader
        dot={
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
            }`}
          />
        }
        label="Live Camera Alerts"
        count={alerts.length}
        onClear={onClearAll}
      />

      <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-0.5" style={{ maxHeight: 420 }}>
        {alerts.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <span className="text-2xl mb-2 opacity-40">📡</span>
            <p className="text-xs text-muted italic">
              {connected ? "Listening for camera alerts…" : "Connecting to WebSocket…"}
            </p>
          </div>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              className={`relative rounded-xl border px-4 py-3 text-sm transition-all ${
                SEVERITY_BG[a.severity] ?? SEVERITY_BG.low
              }`}
            >
              <button
                onClick={() => onDismiss(a.id)}
                aria-label="Dismiss"
                className="absolute top-2 right-3 opacity-40 hover:opacity-100 transition-opacity text-lg leading-none"
              >
                ×
              </button>
              <div className="flex items-center gap-2 mb-1">
                <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[a.severity]}`} />
                <span className="font-semibold capitalize">
                  {a.severity} — {a.data.object_type}
                </span>
              </div>
              <p className="text-xs opacity-80">{a.message}</p>
              <p className="text-xs opacity-50 mt-1">
                {(a.data.confidence * 100).toFixed(1)}%
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

// ──────────────────────────────────────────────────────────────────────────────
// 2. Upload Alerts — driven by accumulated runDetect() results
// ──────────────────────────────────────────────────────────────────────────────
function UploadAlertFeed({
  alerts,
  onDismiss,
  onClearAll,
}: {
  alerts: UploadAlert[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}) {
  return (
    <aside className="flex flex-col rounded-xl border border-line bg-surface p-4">
      <FeedHeader
        dot={<span className="h-2 w-2 rounded-full bg-accent" />}
        label="Alerts"
        count={alerts.length}
        onClear={onClearAll}
      />

      <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-0.5" style={{ maxHeight: 420 }}>
        {alerts.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <span className="text-2xl mb-2 opacity-40">🖼️</span>
            <p className="text-xs text-muted italic">
              Upload and analyse a frame to see results here.
            </p>
          </div>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              className={`relative rounded-xl border px-4 py-3 text-sm transition-all stagger-in ${
                SEVERITY_BG[a.result.alert_level] ?? SEVERITY_BG.low
              }`}
            >
              <button
                onClick={() => onDismiss(a.id)}
                aria-label="Dismiss"
                className="absolute top-2 right-3 opacity-40 hover:opacity-100 transition-opacity text-lg leading-none"
              >
                ×
              </button>

              {/* header row */}
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    SEVERITY_DOT[a.result.alert_level]
                  }`}
                />
                <span className="font-semibold capitalize">
                  {a.result.alert_level}
                  {a.result.alert_flag && (
                    <span className="ml-1.5 text-red-600">⚠ alert</span>
                  )}
                </span>
              </div>

              {/* confidence meter */}
              <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${a.result.confidence * 100}%`,
                    backgroundColor: confidenceColor(a.result.confidence),
                  }}
                />
              </div>

              <p className="text-xs opacity-70">
                {(a.result.confidence * 100).toFixed(1)}% confidence
                {a.result.detections.length > 0 && (
                  <> · {a.result.detections.length} object{a.result.detections.length !== 1 ? "s" : ""}</>
                )}
              </p>

              <p className="text-[10px] opacity-40 mt-0.5 truncate">
                {a.filename}
                &nbsp;·&nbsp;
                {new Date(a.result.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function AdminLivePage() {

  // ── summary stats ────────────────────────────────────────────────────────
  const [summary, setSummary] = useState<AdminLiveSummary | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const mountedRef = useRef(false);

  const stats = [
    { key: "total",       label: "Total alerts",       value: summary?.total_alerts },
    { key: "recent",      label: "Alerts (last hour)",  value: summary?.recent_alerts },
    { key: "detections",  label: "Detections",          value: summary?.total_detections },
    { key: "predictions", label: "Predictions",          value: summary?.total_predictions },
  ];

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminLiveSummary();
      if (mountedRef.current) setSummary(data);
    } catch (e) {
      if (mountedRef.current)
        setError(e instanceof Error ? e.message : "Failed to load live summary.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadSummary();
    return () => { mountedRef.current = false; };
  }, [loadSummary]);

  // ── camera filter ────────────────────────────────────────────────────────
  const [cameraFilter, setCameraFilter] = useState<"all" | "active" | "offline">("all");

  // ── WebSocket alerts (camera live feed) ──────────────────────────────────
  const { alerts: wsAlerts, connected: wsConnected, dismiss: wsDismiss, clearAll: wsClearAll } =
    useAlertSocket();

  // ── detection panel (photo upload) ───────────────────────────────────────
  const [detectOpen, setDetectOpen] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageBlob,    setImageBlob]    = useState<Blob | null>(null);
  const [imageFilename, setImageFilename] = useState("frame.jpg");
  const [result,   setResult]   = useState<DetectResponse | null>(null);
  const [phase,    setPhase]    = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // video upload support
  const [isVideo,   setIsVideo]   = useState(false);
  const [videoUrl,  setVideoUrl]  = useState<string | null>(null);

  const imgRef           = useRef<HTMLImageElement>(null);
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const fileInputRef     = useRef<HTMLInputElement>(null);
  const videoPreviewRef  = useRef<HTMLVideoElement>(null);
  const frameCaptureRef  = useRef<HTMLCanvasElement>(null);

  // ── upload alerts (accumulated locally from runDetect results) ────────────
  const [uploadAlerts, setUploadAlerts] = useState<UploadAlert[]>([]);

  const dismissUpload = useCallback((id: string) => {
    setUploadAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearUploadAlerts = useCallback(() => setUploadAlerts([]), []);

  // poll model status once on mount
  useEffect(() => {
    fetchModelStatus()
      .then((s) => setModelReady(s.model_ready))
      .catch(() => setModelReady(false));
  }, []);

  // redraw bounding boxes when result changes
  useEffect(() => {
    if (!result?.detections.length || !canvasRef.current || !imgRef.current) return;
    const img = imgRef.current;
    const draw = () => drawBoxes(canvasRef.current!, img, result.detections);
    if (img.complete) draw(); else img.onload = draw;
  }, [result, imageDataUrl]);

  const handleFile = useCallback((file: File) => {
    setResult(null);
    setPhase("idle");
    setErrorMsg("");
    setImageFilename(file.name);

    if (file.type.startsWith("video/")) {
      setIsVideo(true);
      // Revoke any previous object URL
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(URL.createObjectURL(file));
      setImageDataUrl(null);
      setImageBlob(null);
    } else if (file.type.startsWith("image/")) {
      setIsVideo(false);
      setVideoUrl(null);
      const reader = new FileReader();
      reader.onload = (e) => setImageDataUrl(e.target?.result as string);
      reader.readAsDataURL(file);
      setImageBlob(file);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleAnalyze = useCallback(async () => {
    if (!imageBlob && !isVideo) return;
    setPhase("loading");
    setResult(null);
    try {
      let blob: Blob;
      let fname = imageFilename;

      if (isVideo && videoPreviewRef.current && frameCaptureRef.current) {
        // Capture the current video frame as a JPEG
        const vid = videoPreviewRef.current;
        const cvs = frameCaptureRef.current;
        cvs.width  = vid.videoWidth  || 640;
        cvs.height = vid.videoHeight || 480;
        const ctx = cvs.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(vid, 0, 0);
        // Show captured frame with bounding boxes via the same imageDataUrl mechanism
        const dataUrl = cvs.toDataURL("image/jpeg", 0.9);
        setImageDataUrl(dataUrl);
        const frameBlob = await new Promise<Blob | null>((res) =>
          cvs.toBlob(res, "image/jpeg", 0.9),
        );
        if (!frameBlob) throw new Error("Failed to capture frame from video");
        blob  = frameBlob;
        fname = "video-frame.jpg";
      } else if (imageBlob) {
        blob  = imageBlob;
        fname = imageFilename;
      } else {
        return;
      }

      const res = await runDetect(blob, fname);
      setResult(res);
      setPhase("success");
      setUploadAlerts((prev) => [
        { id: `${Date.now()}-${Math.random()}`, result: res, filename: imageFilename },
        ...prev,
      ].slice(0, 30));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Detection failed.");
      setPhase("error");
    }
  }, [imageBlob, isVideo, imageFilename]);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <AppShell
      role="admin"
      title="Live Surveillance"
      subtitle="Monitor cameras, run ML detection, and receive real-time alerts."
    >
      <article className="rail-panel p-5 space-y-5">

        {/* ── stat cards ──────────────────────────────────────────────────── */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
              <div key={`sk-${i}`} className="rounded-xl border border-line bg-surface p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-3 w-24 rounded bg-slate-200/80" />
                  <div className="h-7 w-16 rounded bg-slate-200/80" />
                </div>
              </div>
            ))
            : stats.map((item) => (
              <div key={item.key} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-xs uppercase tracking-wide text-muted">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold">
                  {error ? "!" : (item.value ?? 0)}
                </p>
              </div>
            ))}
        </div>

        {/* error banner */}
        {error && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
          >
            <span>Live summary failed: {error}</span>
            <button
              type="button"
              onClick={loadSummary}
              disabled={loading}
              className="rounded-full border border-warning/60 bg-white/70 px-3 py-1 text-xs"
            >
              {loading ? "Retrying…" : "Retry"}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            CAMERA SECTION  –  Camera grid  |  Live Camera Alerts (WebSocket)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">

          {/* Left: filter + camera grid */}
          <div className="flex flex-col gap-3">
            {/* filter pills */}
            <div className="flex flex-wrap gap-2">
              {(["all", "active", "offline"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setCameraFilter(f)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors capitalize ${
                    cameraFilter === f
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-surface hover:border-accent/50"
                  }`}
                >
                  {f === "all" ? "All cameras" : f === "active" ? "Active cameras" : "Offline cameras"}
                </button>
              ))}
            </div>

            {/* 2-column camera grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {cameraGroups
                .filter((_, i) => {
                  if (cameraFilter === "active")  return i % 2 === 0;
                  if (cameraFilter === "offline") return i % 2 !== 0;
                  return true;
                })
                .map((group) => {
                  const originalIndex = cameraGroups.indexOf(group);
                  const isLive       = originalIndex % 2 === 0;
                  const isRealCamera = group === "Platform";

                  return (
                    <div key={group} className="rounded-xl border border-line bg-surface p-3">
                      {loading ? (
                        <div className="animate-pulse space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="h-4 w-28 rounded bg-slate-200/80" />
                            <div className="h-5 w-14 rounded-full bg-slate-200/80" />
                          </div>
                          <div className="h-40 rounded-lg bg-slate-200/80" />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-sm">{group}</h3>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                isLive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {isLive ? "LIVE" : "OFFLINE"}
                            </span>
                          </div>

                          <div className="overflow-hidden rounded-xl">
                            {isRealCamera ? (
                              <LiveCameraFeed />
                            ) : isLive ? (
                              <div className="flex h-36 flex-col items-center justify-center gap-1 rounded-xl bg-slate-100 opacity-40">
                                <span className="text-2xl">📷</span>
                                <span className="text-xs">Feed unavailable</span>
                              </div>
                            ) : (
                              <div className="flex h-36 flex-col items-center justify-center gap-1 rounded-xl bg-slate-100 opacity-25">
                                <span className="text-2xl">⛔</span>
                                <span className="text-xs">No signal</span>
                              </div>
                            )}
                          </div>

                          <p className="mt-2 text-[10px] text-muted">
                            {isRealCamera ? "Device camera · ML active" : "Zone " + (originalIndex + 1)}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right: Live Camera Alerts (WebSocket) */}
          <CameraAlertFeed
            alerts={wsAlerts}
            connected={wsConnected}
            onDismiss={wsDismiss}
            onClearAll={wsClearAll}
          />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            DETECTION SECTION  –  Photo upload  |  Alerts (upload results)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-line overflow-hidden">

          {/* toggle header */}
          <button
            type="button"
            id="detect-section-toggle"
            onClick={() => setDetectOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 bg-surface hover:bg-amber-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🎯</span>
              <div className="text-left">
                <p className="font-semibold text-sm">ML Frame Detection</p>
                <p className="text-xs text-muted">Upload a surveillance frame for AI threat analysis</p>
              </div>
              {/* model status pill */}
              <span
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  modelReady === null
                    ? "border-line text-muted"
                    : modelReady
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-red-300 bg-red-50 text-red-600"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    modelReady === null ? "bg-slate-400" : modelReady ? "bg-emerald-500 animate-pulse" : "bg-red-400"
                  }`}
                />
                {modelReady === null ? "Checking…" : modelReady ? "Model Ready" : "Model Offline"}
              </span>
              {/* upload alert count badge */}
              {uploadAlerts.length > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs text-accent font-semibold">
                  {uploadAlerts.length} alert{uploadAlerts.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <svg
              className={`h-5 w-5 text-muted transition-transform duration-300 ${detectOpen ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* collapsible body */}
          {detectOpen && (
            <div className="border-t border-line bg-panel p-5 stagger-in">
              <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

                {/* LEFT – upload + canvas + result */}
                <div className="flex flex-col gap-4">

                  {/* Hidden frame-capture canvas for video snapshots */}
                  <canvas ref={frameCaptureRef} className="hidden" aria-hidden />

                  {/* drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => !isVideo && !imageDataUrl && fileInputRef.current?.click()}
                    className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all select-none ${
                      isDragging
                        ? "border-accent bg-accent/5"
                        : "border-line bg-surface hover:border-accent/50 hover:bg-amber-50/50"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      id="detect-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/ogg,video/quicktime"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />

                    {/* ── Video preview ── */}
                    {isVideo && videoUrl ? (
                      <div className="relative w-full">
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video
                          ref={videoPreviewRef}
                          src={videoUrl}
                          controls
                          className="w-full rounded-lg"
                          style={{ maxHeight: 400 }}
                        />
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-muted">
                            Pause at the frame you want to analyse, then click Run Detection.
                          </p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setIsVideo(false); setVideoUrl(null); setImageFilename("frame.jpg"); }}
                            className="ml-2 shrink-0 rounded-full border border-line bg-surface px-2 py-0.5 text-xs text-muted hover:text-foreground transition-colors"
                          >
                            Remove
                          </button>
                        </div>

                        {/* After detection on a video frame – show the captured still with boxes */}
                        {imageDataUrl && phase === "success" && (
                          <div className="mt-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img ref={imgRef} src={imageDataUrl} alt="Captured frame" className="hidden" />
                            <canvas
                              ref={canvasRef}
                              className="w-full rounded-lg object-contain border border-line"
                              style={{ maxHeight: 280 }}
                            />
                            <p className="mt-1 text-center text-xs text-muted">Captured frame with detections</p>
                          </div>
                        )}
                      </div>

                    /* ── Image preview ── */
                    ) : imageDataUrl ? (
                      <div className="relative w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img ref={imgRef} src={imageDataUrl} alt="Uploaded frame" className="hidden" />
                        <canvas
                          ref={canvasRef}
                          className="w-full rounded-lg object-contain"
                          style={{ maxHeight: 400 }}
                        />
                        <div className="mt-2 flex items-center justify-center gap-3">
                          <p className="text-xs text-muted">Click to replace</p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs text-muted hover:text-foreground transition-colors"
                          >
                            Browse
                          </button>
                        </div>
                      </div>

                    /* ── Empty state ── */
                    ) : (
                      <>
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-xl">
                          📸
                        </div>
                        <p className="text-sm font-medium">
                          Drop a file or{" "}
                          <span className="text-accent underline underline-offset-2">browse</span>
                        </p>
                        <p className="mt-1 text-xs text-muted">JPEG · PNG · WebP · MP4 · WebM · max 20 MB</p>
                      </>
                    )}
                  </div>

                  {/* analyse button */}
                  <button
                    id="detect-analyze-btn"
                    onClick={handleAnalyze}
                    disabled={(!imageBlob && !isVideo) || phase === "loading"}
                    className={`w-full rounded-xl py-3 text-sm font-semibold tracking-wide transition-all ${
                      (!imageBlob && !isVideo) || phase === "loading"
                        ? "cursor-not-allowed bg-surface text-muted border border-line"
                        : "bg-accent hover:bg-accent-strong text-white shadow-md active:scale-95"
                    }`}
                  >
                    {phase === "loading"
                      ? "Analysing…"
                      : isVideo
                      ? "Capture Frame & Detect"
                      : "Run Detection"}
                  </button>

                  {/* error */}
                  {phase === "error" && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                      {errorMsg}
                    </div>
                  )}

                  {/* inline result card */}
                  {phase === "success" && result && (
                    <div className="rounded-xl border border-line bg-surface p-5 space-y-4 stagger-in">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            SEVERITY_BG[result.alert_level] ?? SEVERITY_BG.low
                          }`}
                        >
                          {result.alert_level.toUpperCase()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted">Confidence</span>
                          <span
                            className="text-lg font-bold"
                            style={{ color: confidenceColor(result.confidence) }}
                          >
                            {(result.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <span
                          className={`ml-auto text-xs font-medium ${
                            result.alert_flag ? "text-red-600" : "text-muted"
                          }`}
                        >
                          {result.alert_flag ? "⚠ Alert broadcast" : "No alert triggered"}
                        </span>
                      </div>

                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${result.confidence * 100}%`,
                            backgroundColor: confidenceColor(result.confidence),
                          }}
                        />
                      </div>

                      {result.detections.length > 0 ? (
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="text-muted border-b border-line">
                              <th className="pb-2 pr-4 font-medium">Label</th>
                              <th className="pb-2 pr-4 font-medium">Confidence</th>
                              <th className="pb-2 font-medium">Bounding Box</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.detections.map((d, i) => (
                              <tr key={i} className="border-b border-line last:border-none">
                                <td className="py-2 pr-4 font-semibold capitalize">{d.label}</td>
                                <td
                                  className="py-2 pr-4"
                                  style={{ color: confidenceColor(d.confidence) }}
                                >
                                  {(d.confidence * 100).toFixed(1)}%
                                </td>
                                <td className="py-2 text-muted font-mono text-[10px]">
                                  x{d.bbox.x.toFixed(0)} y{d.bbox.y.toFixed(0)}{" "}
                                  {d.bbox.w.toFixed(0)}×{d.bbox.h.toFixed(0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-sm text-muted">No objects detected above threshold.</p>
                      )}

                      <p className="text-xs text-muted pt-1">
                        Model: <span className="text-foreground">{result.model_type}</span>
                        &nbsp;·&nbsp;
                        {new Date(result.timestamp).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* RIGHT – Upload Alerts feed */}
                <UploadAlertFeed
                  alerts={uploadAlerts}
                  onDismiss={dismissUpload}
                  onClearAll={clearUploadAlerts}
                />
              </div>
            </div>
          )}
        </div>

      </article>
    </AppShell>
  );
}
