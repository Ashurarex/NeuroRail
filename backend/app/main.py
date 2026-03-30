from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_token
from app.database import Base, engine, get_db
from app import models
from app.routes import (
    admin_router,
    alert_router,
    auth_router,
    detect_router,
    detections_router,
    lost_found_router,
    predictions_router,
    reports_router,
    users_router,
)
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