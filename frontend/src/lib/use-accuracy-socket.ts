"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth";

const WS_BASE_URL =
    (process.env.NEXT_PUBLIC_WS_URL ?? "ws://127.0.0.1:8000") + "/ws/accuracy";

const RECONNECT_DELAY_MS = 3_000;
const MAX_HISTORY = 60;

export type AccuracyPayload = {
    type: "ACCURACY";
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    total_detections: number;
    correct: number;
    incorrect: number;
    timestamp: string;
};

export type AccuracyMetrics = Omit<AccuracyPayload, "type">;

export function useAccuracySocket(enabled: boolean) {
    const [connected, setConnected] = useState(false);
    const [metrics, setMetrics] = useState<AccuracyMetrics | null>(null);
    const [history, setHistory] = useState<number[]>([]);
    const [latencyMs, setLatencyMs] = useState<number | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const unmounted = useRef(false);

    const connect = useCallback(function connectWs() {
        if (unmounted.current || !enabled) {
            if (!enabled && wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        const token = getAuthToken();
        if (!token) {
            console.warn("[useAccuracySocket] No auth token available, retrying...");
            setConnected(false);
            if (!reconnectTimer.current) {
                reconnectTimer.current = setTimeout(connectWs, RECONNECT_DELAY_MS);
            }
            return;
        }

        try {
            const wsUrl = `${WS_BASE_URL}?token=${encodeURIComponent(token)}`;
            console.log("[useAccuracySocket] Connecting to", wsUrl);
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("[useAccuracySocket] Connected");
                if (!unmounted.current) setConnected(true);
                if (reconnectTimer.current) {
                    clearTimeout(reconnectTimer.current);
                    reconnectTimer.current = null;
                }
            };

            ws.onmessage = (event: MessageEvent) => {
                if (unmounted.current) return;
                try {
                    const payload = JSON.parse(event.data as string) as AccuracyPayload;
                    if (payload.type !== "ACCURACY") return;
                    setMetrics((prev) => {
                        if (
                            prev &&
                            prev.timestamp === payload.timestamp &&
                            prev.total_detections === payload.total_detections
                        ) {
                            return prev;
                        }
                        return {
                            accuracy: payload.accuracy,
                            precision: payload.precision,
                            recall: payload.recall,
                            f1_score: payload.f1_score,
                            total_detections: payload.total_detections,
                            correct: payload.correct,
                            incorrect: payload.incorrect,
                            timestamp: payload.timestamp,
                        };
                    });
                    setHistory((prev) => {
                        const next = [...prev, payload.accuracy];
                        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
                    });
                    const now = Date.now();
                    const sentAt = new Date(payload.timestamp).getTime();
                    if (!Number.isNaN(sentAt)) {
                        setLatencyMs(Math.max(0, now - sentAt));
                    }
                } catch (err) {
                    console.error("[useAccuracySocket] Parse error:", err);
                }
            };

            ws.onerror = (event) => {
                console.error("[useAccuracySocket] WebSocket error:", event);
                ws.close();
            };

            ws.onclose = () => {
                console.log("[useAccuracySocket] Disconnected");
                if (!unmounted.current) {
                    setConnected(false);
                    if (enabled) {
                        console.log("[useAccuracySocket] Scheduling reconnect in", RECONNECT_DELAY_MS, "ms");
                        reconnectTimer.current = setTimeout(connectWs, RECONNECT_DELAY_MS);
                    }
                }
            };
        } catch (err) {
            console.error("[useAccuracySocket] Connection error:", err);
            if (!reconnectTimer.current) {
                reconnectTimer.current = setTimeout(connectWs, RECONNECT_DELAY_MS);
            }
        }
    }, [enabled]);

    useEffect(() => {
        unmounted.current = false;
        connect();
        return () => {
            unmounted.current = true;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, [connect]);

    const averageAccuracy = useMemo(() => {
        if (!history.length) return null;
        const sum = history.reduce((total, value) => total + value, 0);
        return Math.round((sum / history.length) * 100) / 100;
    }, [history]);

    return { connected, metrics, history, latencyMs, averageAccuracy };
}
