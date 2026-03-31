import asyncio
from contextlib import asynccontextmanager, suppress
from pathlib import Path
import logging

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_admin_token, verify_token
from app.database import AsyncSessionLocal, Base, engine, get_db
from app.services.accuracy_service import accuracy_broadcast_loop
from app.services.ml_service import ml_service  # initialised at import time

logger = logging.getLogger(__name__)
from app import models
from app.routes import (
    admin_router,
    alert_router,
    auth_router,
    detect_router,
    detections_router,
    lost_found_router,
    lost_item_router,
    matches_router,
    predictions_router,
    reports_router,
    users_router,
)
from app.websocket.manager import accuracy_manager, intel_manager, manager, match_manager


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info(
        "ML service ready=%s type=%s path=%s",
        ml_service.is_ready,
        ml_service.model_type,
        ml_service.model_path,
    )
    accuracy_task = asyncio.create_task(accuracy_broadcast_loop(accuracy_manager))
    yield
    accuracy_task.cancel()
    with suppress(asyncio.CancelledError):
        await accuracy_task

app = FastAPI(
    title="NeuroRail Backend",
    description="AI-powered Railway Surveillance & Safety Monitoring System",
    version="1.0.0",
    lifespan=lifespan,
)

UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


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
# 💚 HEALTH CHECK
# -------------------------
@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Check if backend and database are operational."""
    try:
        from sqlalchemy import text
        
        # Try a simple database query
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        
        return {
            "status": "healthy",
            "message": "Backend and database operational",
            "database": "connected"
        }
    except Exception as e:
        print(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "message": f"Database error: {str(e)}",
            "database": "disconnected"
        }, 503


# -------------------------
# 🧪 MOCK LOGIN FOR DEVELOPMENT
# -------------------------
@app.post("/mock-login")
async def mock_login(payload: dict, db: AsyncSession = Depends(get_db)):
    """Development endpoint to create test tokens without needing database."""
    try:
        from app.core.auth import create_token
        
        email = payload.get("email", "").lower()
        if not email:
            return {"error": "Email is required"}, 400
        
        is_admin = email.startswith("admin") or "admin" in email
        
        print(f"Mock login requested: {email} (admin={is_admin})")
        
        token = create_token({
            "user_id": f"demo-{email}",
            "is_admin": is_admin,
        })
        
        print(f"Token created successfully for {email}")
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": "admin" if is_admin else "user",
            "message": f"Login successful for {email}"
        }
    except Exception as e:
        print(f"Mock login error: {e}")
        return {"error": f"Login failed: {str(e)}"}, 500


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


@app.websocket("/ws/lost-found-matches")
async def lost_found_matches_websocket(websocket: WebSocket):
    await match_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        match_manager.disconnect(websocket)


@app.websocket("/ws/accuracy")
async def accuracy_websocket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    async with AsyncSessionLocal() as db:
        try:
            await verify_admin_token(token, db)
        except Exception:
            await websocket.close(code=1008)
            return

    await accuracy_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        accuracy_manager.disconnect(websocket)


@app.websocket("/ws/intel")
async def intel_websocket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    async with AsyncSessionLocal() as db:
        try:
            await verify_admin_token(token, db)
        except Exception:
            await websocket.close(code=1008)
            return

    await intel_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        intel_manager.disconnect(websocket)


# -------------------------
# 📡 ROUTERS
# -------------------------
app.include_router(auth_router)
app.include_router(detect_router)
app.include_router(alert_router)
app.include_router(reports_router)  # ✅ NEW (admin analytics)
app.include_router(admin_router)
app.include_router(users_router)
app.include_router(detections_router)
app.include_router(predictions_router)
app.include_router(lost_found_router)
app.include_router(lost_item_router)
app.include_router(matches_router)


# (duplicate /health removed – the async version above is canonical)