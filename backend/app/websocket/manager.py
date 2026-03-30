import asyncio
from fastapi import WebSocket
from typing import List


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print("Client connected")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print("Client disconnected")

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        await asyncio.gather(
            *(connection.send_json(message) for connection in self.active_connections),
            return_exceptions=True,
        )


manager = ConnectionManager()