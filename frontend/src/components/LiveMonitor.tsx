"use client";

import type { BehaviorPayload, BehaviorTrack } from "@/lib/use-intel-socket";

function tone(risk: number) {
    if (risk >= 0.85) return "text-red-600";
    if (risk >= 0.7) return "text-amber-600";
    return "text-emerald-600";
}

function formatDuration(seconds: number) {
    if (!Number.isFinite(seconds)) return "-";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.round(seconds % 60);
    return `${minutes}m ${remaining}s`;
}

function TrackRow({ track }: { track: BehaviorTrack }) {
    return (
        <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
                <span className="font-semibold">ID {track.id}</span>
                <span className={`font-semibold ${tone(track.risk_score)}`}>
                    {(track.risk_score * 100).toFixed(0)}%
                </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-muted">
                <span>Pattern: {track.movement_pattern}</span>
                <span>Duration: {formatDuration(track.duration_in_frame)}</span>
            </div>
            <div className="mt-1 font-mono text-[10px] text-muted">
                bbox x{track.bbox.x?.toFixed?.(0) ?? "-"} y{track.bbox.y?.toFixed?.(0) ?? "-"}
                {" "}w{track.bbox.w?.toFixed?.(0) ?? "-"} h{track.bbox.h?.toFixed?.(0) ?? "-"}
            </div>
        </div>
    );
}

export default function LiveMonitor({ behavior }: { behavior: BehaviorPayload | null }) {
    if (!behavior) {
        return (
            <div className="rounded-xl border border-line bg-surface p-4">
                <p className="text-sm text-muted">Waiting for live behavior data...</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold">Live Behaviour Monitoring</p>
                    <p className="text-xs text-muted">
                        Camera {behavior.camera_id} · {behavior.location ?? "Location pending"}
                    </p>
                </div>
                <span className={`text-sm font-semibold ${tone(behavior.risk_score)}`}>
                    Risk {(behavior.risk_score * 100).toFixed(0)}%
                </span>
            </div>

            <div className="mt-3 grid gap-2 text-xs text-muted md:grid-cols-3">
                <div>Crowd count: {behavior.crowd_count}</div>
                <div>Suspicious behaviors: {behavior.suspicious_behaviors}</div>
                <div>Abandoned objects: {behavior.abandoned_objects}</div>
            </div>

            <div className="mt-4 space-y-2">
                {behavior.tracks.length === 0 ? (
                    <p className="text-sm text-muted">No tracked passengers yet.</p>
                ) : (
                    behavior.tracks.slice(0, 6).map((track) => <TrackRow key={track.id} track={track} />)
                )}
            </div>
        </div>
    );
}
