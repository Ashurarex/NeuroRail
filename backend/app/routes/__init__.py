from app.routes.alert import router as alert_router
from app.routes.admin import router as admin_router
from app.routes.auth import router as auth_router
from app.routes.detect import router as detect_router
from app.routes.detections import router as detections_router
from app.routes.predictions import router as predictions_router
from app.routes.reports import router as reports_router
from app.routes.users import router as users_router

__all__ = [
	"auth_router",
	"detect_router",
	"alert_router",
	"reports_router",
	"admin_router",
	"users_router",
	"detections_router",
	"predictions_router",
]
