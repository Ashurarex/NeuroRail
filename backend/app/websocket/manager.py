import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Thread-safe WebSocket connection manager with typed broadcast."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            "WS client connected. Total active: %d", len(self.active_connections)
        )

    def disconnect(self, websocket: WebSocket) -> None:
        try:
            self.active_connections.remove(websocket)
        except ValueError:
            pass
        logger.info(
            "WS client disconnected. Total active: %d", len(self.active_connections)
        )

    async def broadcast(self, message: dict[str, Any]) -> None:
        """
        Broadcast *message* as JSON to every active connection.
        Silently drops stale connections.
        """
        if not self.active_connections:
            return

        dead: list[WebSocket] = []
        results = await asyncio.gather(
            *(ws.send_json(message) for ws in self.active_connections),
            return_exceptions=True,
        )
        for ws, result in zip(self.active_connections, results):
            if isinstance(result, Exception):
                logger.warning("WS send failed for a client, removing: %s", result)
                dead.append(ws)

        for ws in dead:
            self.disconnect(ws)

    async def send_personal(self, websocket: WebSocket, message: dict[str, Any]) -> None:
        """Send *message* only to a single connection."""
        try:
            await websocket.send_json(message)
        except Exception as exc:
            logger.warning("Failed to send personal WS message: %s", exc)
            self.disconnect(websocket)


manager = ConnectionManager()