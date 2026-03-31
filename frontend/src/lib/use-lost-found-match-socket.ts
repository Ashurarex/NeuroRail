"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WS_URL =
    (process.env.NEXT_PUBLIC_WS_URL ?? "ws://127.0.0.1:8000") +
    "/ws/lost-found-matches";

const RECONNECT_DELAY_MS = 3_000;

export type WsLostFoundMatch = {
    id: string;
    type: "MATCH";
    case_id: string;
    match_id: string;
    timestamp: string;
};

export function useLostFoundMatchSocket() {
    const [connected, setConnected] = useState(false);
    const [events, setEvents] = useState<WsLostFoundMatch[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const unmounted = useRef(false);

    const connect = useCallback(function connectWs() {
        if (unmounted.current) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!unmounted.current) setConnected(true);
        };

        ws.onmessage = (event: MessageEvent) => {
            if (unmounted.current) return;
            try {
                const payload = JSON.parse(event.data as string) as Omit<WsLostFoundMatch, "id">;
                if (payload.type !== "MATCH") return;
                const entry: WsLostFoundMatch = {
                    ...payload,
                    id: `${Date.now()}-${Math.random()}`,
                };
                setEvents((prev) => [entry, ...prev].slice(0, 50));
            } catch {
                // ignore non-JSON frames
            }
        };

        ws.onerror = () => {
            ws.close();
        };

        ws.onclose = () => {
            if (!unmounted.current) {
                setConnected(false);
                reconnectTimer.current = setTimeout(connectWs, RECONNECT_DELAY_MS);
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

    const clearEvents = useCallback(() => setEvents([]), []);

    return { connected, events, clearEvents };
}
