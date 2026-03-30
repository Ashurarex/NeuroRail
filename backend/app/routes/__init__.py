from app.routes.alert import router as alert_router
from app.routes.auth import router as auth_router
from app.routes.detect import router as detect_router
from app.routes.reports import router as reports_router

__all__ = ["auth_router", "detect_router", "alert_router", "reports_router"]
