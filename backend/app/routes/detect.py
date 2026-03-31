"""
NeuroRail – /detect endpoint
Accepts an uploaded image, runs ML inference, persists to DB, and broadcasts
a WebSocket alert when confidence crosses the threshold.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_token
from app.database import get_db
from app.models import Alert, Detection, User
from app.services.ml_service import ALERT_THRESHOLD, ml_service
from app.services.detection_service import queue_detection_processing
from app.websocket.manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Detection"])

# ── helpers ──────────────────────────────────────────────────────────────────

_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
_MAX_BYTES = 20 * 1024 * 1024  # 20 MB


def _severity(confidence: float) -> str:
    if confidence >= 0.85:
        return "high"
    if confidence >= 0.60:
        return "medium"
    return "low"


# ── route ─────────────────────────────────────────────────────────────────────

@router.post("/detect", status_code=status.HTTP_200_OK)
async def detect(
    file: UploadFile = File(..., description="JPEG/PNG/WebP image to analyse"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(verify_token),
) -> dict:
    """
    Run ML inference on an uploaded image.

    Returns:
    ```json
    {
      "status": "ok",
      "detections": [...],
      "confidence": 0.93,
      "alert_id": "...",
      "alert_level": "high",
      "timestamp": "2024-01-01T00:00:00Z"
    }
    ```
    """
    # ── 1. validate upload ────────────────────
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{file.content_type}'. Use JPEG, PNG, or WebP.",
        )

    image_bytes = await file.read()

    if len(image_bytes) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds 20 MB limit.",
        )

    if not ml_service.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model is not loaded. Check server logs.",
        )

    # ── 2. run inference (non-blocking) ───────
    try:
        detection_items = await ml_service.predict(image_bytes)
    except Exception as exc:
        logger.exception("Inference error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ML inference failed.",
        ) from exc

    # ── 3. compute aggregate confidence ───────
    top_confidence: float = (
        max(item.confidence for item in detection_items) if detection_items else 0.0
    )
    top_label: str = (
        max(detection_items, key=lambda d: d.confidence).label
        if detection_items
        else "none"
    )
    alert_level = _severity(top_confidence)
    alert_flag = top_confidence >= ALERT_THRESHOLD
    now = datetime.now(tz=timezone.utc)

    # ── 4. persist to DB ──────────────────────
    try:
        alert = Alert(
            object_type=top_label,
            confidence=top_confidence,
            bbox=detection_items[0].bbox if detection_items else {},
            alert_level=alert_level,
            image_url=None,   # no disk writes; extend if S3/static serving needed
            user_id=user.id,
            created_at=now,
        )
        db.add(alert)
        await db.flush()

        detection_rows = [
            Detection(
                alert_id=alert.id,
                label=item.label,
                confidence=item.confidence,
                bbox=item.bbox,
                created_at=now,
            )
            for item in detection_items
        ]
        if detection_rows:
            db.add_all(detection_rows)

        await db.commit()
        await db.refresh(alert)
    except Exception as exc:
        await db.rollback()
        logger.exception("DB persist failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist detection result.",
        ) from exc

    # ── 5. broadcast WebSocket alert ──────────
    if alert_flag:
        ws_payload = {
            "type": "ALERT",
            "severity": alert_level,
            "message": f"{top_label.title()} detected on track",
            "data": {
                "alert_id": str(alert.id),
                "object_type": top_label,
                "confidence": round(top_confidence, 4),
                "alert_level": alert_level,
                "detections": [d.to_dict() for d in detection_items],
                "timestamp": now.isoformat(),
            },
        }
        asyncio.create_task(manager.broadcast(ws_payload))

    await queue_detection_processing(
        camera_id="manual-upload",
        location=None,
        detections=[d.to_dict() for d in detection_items],
        timestamp=now,
    )

    # ── 6. HTTP response ──────────────────────
    return {
        "status": "ok",
        "detections": [d.to_dict() for d in detection_items],
        "confidence": round(top_confidence, 4),
        "alert_id": str(alert.id),
        "alert_level": alert_level,
        "alert_flag": alert_flag,
        "model_type": ml_service.model_type,
        "timestamp": now.isoformat(),
    }


# ── model status endpoint ─────────────────────────────────────────────────────

@router.get("/detect/status", tags=["Detection"])
async def model_status() -> dict:
    """Return the current ML model load status (no auth required)."""
    return {
        "model_ready": ml_service.is_ready,
        "model_type": ml_service.model_type,
        "model_path": ml_service.model_path,
        "alert_threshold": ALERT_THRESHOLD,
    }
