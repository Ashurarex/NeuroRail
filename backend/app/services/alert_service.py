from datetime import datetime
from sqlalchemy.orm import Session

from app.db.crud import create_alert as db_create_alert
from app.websocket.manager import manager


async def create_alert(
    db: Session,
    object_type: str,
    confidence: float,
    bbox: dict,
    alert_level: str = "medium",
    image_url: str = None,
    user_id: str = None
):
    """
    Creates alert in DB + broadcasts via WebSocket
    """

    # -------------------------
    # Save to DB
    # -------------------------
    alert_data = {
        "object_type": object_type,
        "confidence": confidence,
        "bbox": bbox,
        "alert_level": alert_level,
        "image_url": image_url,
        "user_id": user_id
    }

    saved_alert = db_create_alert(db, alert_data)

    # -------------------------
    # Broadcast payload
    # -------------------------
    payload = {
        "id": str(saved_alert.id),
        "object_type": object_type,
        "confidence": confidence,
        "bbox": bbox,
        "alert_level": alert_level,
        "image_url": image_url,
        "timestamp": datetime.utcnow().isoformat()
    }

    await manager.broadcast(payload)

    return payload