"use client";

import type { PredictionPayload } from "@/lib/use-intel-socket";

function tone(value: number) {
    if (value >= 0.85) return "bg-red-500";
    if (value >= 0.7) return "bg-amber-400";
    return "bg-emerald-500";
}

export default function RiskPanel({ prediction }: { prediction: PredictionPayload | null }) {
    if (!prediction) {
        return (
            <div className="rounded-xl border border-line bg-surface p-4">
                <p className="text-sm text-muted">Waiting for predictive analytics...</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Predicted Risks</p>
                <span className="text-xs text-muted">{prediction.camera_id}</span>
            </div>

            <p className="mt-2 text-lg font-bold capitalize">{prediction.incident_type}</p>
            <p className="text-xs text-muted">
                {prediction.location ?? "Location pending"} · Confidence {prediction.confidence}%
            </p>

            <div className="mt-3 h-2 rounded-full bg-surface-alt">
                <div
                    className={`h-2 rounded-full ${tone(prediction.incident_risk)}`}
                    style={{ width: `${Math.min(prediction.incident_risk * 100, 100)}%` }}
                />
            </div>

            <p className="mt-2 text-xs text-muted">
                Incident risk {(prediction.incident_risk * 100).toFixed(0)}%
            </p>
        </div>
    );
}
