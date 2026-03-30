from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.crud import get_alerts
from app.db import models

router = APIRouter(tags=["Alerts"])


@router.get("/alerts")
def fetch_alerts(
    severity: str = Query(None),
    object_type: str = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Alert)

    if severity:
        query = query.filter(models.Alert.alert_level == severity)

    if object_type:
        query = query.filter(models.Alert.object_type == object_type)

    alerts = query.order_by(models.Alert.created_at.desc()).all()

    return [
        {
            "id": str(a.id),
            "object_type": a.object_type,
            "confidence": a.confidence,
            "bbox": a.bbox,
            "alert_level": a.alert_level,
            "image_url": a.image_url,
            "created_at": a.created_at.isoformat()
        }
        for a in alerts
    ]