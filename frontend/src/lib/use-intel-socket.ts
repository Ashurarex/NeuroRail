"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth";

const WS_BASE_URL =
    (process.env.NEXT_PUBLIC_WS_URL ?? "ws://127.0.0.1:8000") + "/ws/intel";

const RECONNECT_DELAY_MS = 3_000;
const MAX_ALERTS = 20;

export type BehaviorTrack = {
    id: number;
    duration_in_frame: number;
    movement_pattern: string;
    risk_score: number;
    bbox: Record<string, number>;
};

export type BehaviorPayload = {
    type: "BEHAVIOR";
    camera_id: string;
    location: string | null;
    timestamp: string;
    risk_score: number;
    crowd_count: number;
    crowd_alert: boolean;
    abandoned_objects: number;
    suspicious_behaviors: number;
    tracks: BehaviorTrack[];
};

export type PredictionPayload = {
    type: "PREDICTION";
    camera_id: string;
    location: string | null;
    timestamp: string;
    incident_risk: number;
    incident_type: string;
    confidence: number;
};

export type AlertPayload = {
    type: "ALERT" | "CRITICAL";
    message: string;
    location: string | null;
    camera_id: string;
    timestamp: string;
    confidence: number;
};

export function useIntelSocket(enabled: boolean) {
    const [connected, setConnected] = useState(false);
    const [behavior, setBehavior] = useState<BehaviorPayload | null>(null);
    const [prediction, setPrediction] = useState<PredictionPayload | null>(null);
    const [alerts, setAlerts] = useState<AlertPayload[]>([]);
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
            console.warn("[useIntelSocket] No auth token available, retrying...");
            setConnected(false);
            if (!reconnectTimer.current) {
                reconnectTimer.current = setTimeout(connectWs, RECONNECT_DELAY_MS);
            }
            return;
        }

        try {
            const wsUrl = `${WS_BASE_URL}?token=${encodeURIComponent(token)}`;
            console.log("[useIntelSocket] Connecting to", wsUrl);
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("[useIntelSocket] Connected");
                if (!unmounted.current) setConnected(true);
                if (reconnectTimer.current) {
                    clearTimeout(reconnectTimer.current);
                    reconnectTimer.current = null;
                }
            };

            ws.onmessage = (event: MessageEvent) => {
                if (unmounted.current) return;
                try {
                    const payload = JSON.parse(event.data as string) as
                        | BehaviorPayload
                        | PredictionPayload
                        | AlertPayload;

                    if (payload.type === "BEHAVIOR") {
                        console.log("[useIntelSocket] BEHAVIOR event received", payload);
                        setBehavior(payload);
                    } else if (payload.type === "PREDICTION") {
                        console.log("[useIntelSocket] PREDICTION event received", payload);
                        setPrediction(payload);
                    } else if (payload.type === "ALERT" || payload.type === "CRITICAL") {
                        console.log("[useIntelSocket] ALERT event received", payload);
                        setAlerts((prev) => [payload, ...prev].slice(0, MAX_ALERTS));
                    }
                } catch (err) {
                    console.error("[useIntelSocket] Parse error:", err);
                }
            };

            ws.onerror = (event) => {
                console.error("[useIntelSocket] WebSocket error:", event);
                ws.close();
            };

            ws.onclose = () => {
                console.log("[useIntelSocket] Disconnected");
                if (!unmounted.current) {
                    setConnected(false);
                    if (enabled) {
                        console.log("[useIntelSocket] Scheduling reconnect in", RECONNECT_DELAY_MS, "ms");
                        reconnectTimer.current = setTimeout(connectWs, RECONNECT_DELAY_MS);
                    }
                }
            };
        } catch (err) {
            console.error("[useIntelSocket] Connection error:", err);
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

    const highestRiskTrack = useMemo(() => {
        if (!behavior?.tracks?.length) return null;
        return [...behavior.tracks].sort((a, b) => b.risk_score - a.risk_score)[0];
    }, [behavior]);

    return {
        connected,
        behavior,
        prediction,
        alerts,
        highestRiskTrack,
    };
}
