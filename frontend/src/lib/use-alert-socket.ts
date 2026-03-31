"use client";

/**
 * useAlertSocket – WebSocket hook for real-time NeuroRail alerts.
 *
 * Usage:
 *   const { alerts, connected } = useAlertSocket();
 */
import { useCallback, useEffect, useRef, useState } from "react";

const WS_URL =
  (process.env.NEXT_PUBLIC_WS_URL ?? "ws://127.0.0.1:8000") + "/ws/alerts";

const RECONNECT_DELAY_MS = 3_000;
const MAX_ALERTS = 50;

// ── Types ─────────────────────────────────────────────────────────────────────

export type AlertSeverity = "high" | "medium" | "low";

export type WsAlert = {
  id: string; // generated client-side for React list keys
  type: "ALERT";
  severity: AlertSeverity;
  message: string;
  data: {
    alert_id: string;
    object_type: string;
    confidence: number;
    alert_level: AlertSeverity;
    detections: Array<{
      label: string;
      confidence: number;
      bbox: { x: number; y: number; w: number; h: number };
    }>;
    timestamp: string;
  };
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAlertSocket() {
  const [alerts, setAlerts] = useState<WsAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmounted = useRef(false);

  const connect = useCallback(() => {
    if (unmounted.current) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!unmounted.current) setConnected(true);
    };

    ws.onmessage = (event: MessageEvent) => {
      if (unmounted.current) return;
      try {
        const raw = JSON.parse(event.data as string) as Omit<WsAlert, "id">;
        if (raw.type !== "ALERT") return;
        const alert: WsAlert = { ...raw, id: `${Date.now()}-${Math.random()}` };
        setAlerts((prev) => [alert, ...prev].slice(0, MAX_ALERTS));
      } catch {
        // non-JSON frame – ignore
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onclose = () => {
      if (!unmounted.current) {
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };
  }, []);

  useEffect(() => {
    unmounted.current = false;
    connect();
    return () => {
      unmounted.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const dismiss = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAll = useCallback(() => setAlerts([]), []);

  return { alerts, connected, dismiss, clearAll };
}
