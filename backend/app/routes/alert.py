from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Alert

router = APIRouter(tags=["Alerts"])


@router.get("/alerts")
async def fetch_alerts(
    severity: str | None = Query(None),
    object_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    query = select(Alert)

    if severity:
        query = query.where(Alert.alert_level == severity)
    if object_type:
        query = query.where(Alert.object_type == object_type)

    query = query.order_by(Alert.created_at.desc())
    result = await db.execute(query)
    alerts = result.scalars().all()

    return [
        {
            "id": str(a.id),
            "object_type": a.object_type,
            "confidence": a.confidence,
            "bbox": a.bbox,
            "alert_level": a.alert_level,
            "image_url": a.image_url,
            "created_at": a.created_at.isoformat(),
        }
        for a in alerts
    ]
