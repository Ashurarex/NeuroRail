from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import Incident

logger = logging.getLogger(__name__)

ALERT_THRESHOLD = 0.7
CRITICAL_THRESHOLD = 0.85


async def _persist_incident(payload: dict[str, Any]) -> None:
    async with AsyncSessionLocal() as db:
        try:
            incident = Incident(
                severity=payload.get("type", "ALERT"),
                message=payload.get("message", "Incident detected"),
                location=payload.get("location"),
                camera_id=payload.get("camera_id"),
                payload=payload,
                created_at=datetime.now(tz=timezone.utc),
            )
            db.add(incident)
            await db.commit()
        except Exception as exc:
            await db.rollback()
            logger.warning("Failed to persist incident: %s", exc)


def build_alert_payload(
    *,
    camera_id: str,
    location: str | None,
    incident_risk: float,
    incident_type: str,
) -> dict[str, Any] | None:
    if incident_risk < ALERT_THRESHOLD:
        return None

    severity = "CRITICAL" if incident_risk >= CRITICAL_THRESHOLD else "ALERT"
    payload = {
        "type": severity,
        "message": f"{incident_type.title()} detected",
        "location": location,
        "camera_id": camera_id,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "confidence": int(round(incident_risk * 100)),
    }
    return payload


async def handle_alerts(payload: dict[str, Any] | None) -> None:
    if not payload:
        return
    asyncio.create_task(_persist_incident(payload))
