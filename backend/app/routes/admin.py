from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_admin
from app.database import get_db
from app.models import Alert, Detection, Prediction, User

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users")
async def list_users(
    _: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, str | None]]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()

    return [
        {
            "id": str(user.id),
            "email": user.email,
            "role": "admin" if user.is_admin else "user",
            "status": "active",
            "last_login": None,
        }
        for user in users
    ]


@router.get("/live-summary")
async def live_summary(
    _: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    cutoff = datetime.utcnow() - timedelta(hours=1)

    total_alerts = (await db.execute(select(func.count(Alert.id)))).scalar_one()
    recent_alerts = (
        await db.execute(select(func.count(Alert.id)).where(Alert.created_at >= cutoff))
    ).scalar_one()
    total_detections = (await db.execute(select(func.count(Detection.id)))).scalar_one()
    total_predictions = (await db.execute(select(func.count(Prediction.id)))).scalar_one()

    return {
        "total_alerts": total_alerts,
        "recent_alerts": recent_alerts,
        "total_detections": total_detections,
        "total_predictions": total_predictions,
    }
