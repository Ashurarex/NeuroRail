from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

# 🔐 Auth
from app.core.auth import verify_token

# 📦 Routers
from app.routers.detect import router as detect_router
from app.routers.alert import router as alert_router
from app.routers.reports import router as reports_router  # ✅ NEW

# 🗄️ DB
from app.db.database import engine, Base
from app.routers.auth import router as auth_router

app = FastAPI(
    title="NeuroRail Backend",
    description="AI-powered Railway Surveillance & Safety Monitoring System",
    version="1.0.0",
)


# -------------------------
# 🚀 STARTUP: DB INIT
# -------------------------
@app.on_event("startup")
def on_startup():
    print("🚀 Starting NeuroRail backend...")

    # Create tables if not exist
    Base.metadata.create_all(bind=engine)

    print("✅ Database connected & tables ready")


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
def protected(user=Depends(verify_token)):
    return {
        "message": "Protected route",
        "user": user
    }


# -------------------------
# 📡 ROUTERS
# -------------------------
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
            "websockets",
            "supabase-storage"
        ]
    }