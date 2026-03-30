from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.auth import verify_token
from app.database import Base, engine
from app import models
from app.routes import alert_router, auth_router, detect_router, reports_router
from app.websocket.manager import manager


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="NeuroRail Backend",
    description="AI-powered Railway Surveillance & Safety Monitoring System",
    version="1.0.0",
    lifespan=lifespan,
)


# -------------------------
# 🌐 CORS
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------
# 🧪 ROOT
# -------------------------
@app.get("/")
def root():
    return {"message": "NeuroRail backend running 🚆"}


# -------------------------
# 🔐 PROTECTED TEST
# -------------------------
@app.get("/protected")
async def protected(user=Depends(verify_token)):
    return {
        "message": "Protected route",
        "user": user
    }


@app.websocket("/ws/alerts")
async def alerts_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# -------------------------
# 📡 ROUTERS
# -------------------------
app.include_router(auth_router)
app.include_router(detect_router)
app.include_router(alert_router)
app.include_router(reports_router)  # ✅ NEW (admin analytics)


# -------------------------
# ❤️ HEALTH CHECK
# -------------------------
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "NeuroRail Backend",
        "features": [
            "alerts",
            "reports",
            "websockets"
        ]
    }