"use client";

import type { AlertPayload } from "@/lib/use-intel-socket";

const ALERT_TONE: Record<string, string> = {
    ALERT: "border-amber-300 bg-amber-50/60 text-amber-700",
    CRITICAL: "border-red-400 bg-red-50/60 text-red-700",
};

export default function AlertsPanel({ alerts }: { alerts: AlertPayload[] }) {
    return (
        <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Active Alerts</p>
                <span className="text-xs text-muted">{alerts.length}</span>
            </div>

            <div className="mt-3 space-y-2">
                {alerts.length === 0 ? (
                    <p className="text-sm text-muted">No active alerts.</p>
                ) : (
                    alerts.map((alert, index) => (
                        <div
                            key={`${alert.timestamp}-${index}`}
                            className={`rounded-lg border px-3 py-2 text-xs ${ALERT_TONE[alert.type] ?? "border-line bg-surface-alt"}`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-semibold">{alert.type}</span>
                                <span className="text-[10px] opacity-70">{alert.confidence}%</span>
                            </div>
                            <p className="mt-1 font-medium">{alert.message}</p>
                            <p className="mt-1 text-[10px] opacity-70">
                                {alert.location ?? "Location pending"} · {new Date(alert.timestamp).toLocaleTimeString()}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
