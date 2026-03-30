import asyncio
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_token
from app.database import get_db
from app.models import Alert, Detection, User
from app.websocket.manager import manager

router = APIRouter(tags=["Detection"])

UPLOAD_DIR = Path("uploads")


@router.post("/detect")
async def detect(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(verify_token),
) -> dict[str, object]:
    contents = await file.read()

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    saved_name = f"{user.id}_{file.filename}"
    file_path = UPLOAD_DIR / saved_name
    await asyncio.to_thread(file_path.write_bytes, contents)
    image_url = f"/{file_path.as_posix()}"

    detections_payload = [
        {
            "label": "person",
            "confidence": 0.93,
            "bbox": {"x": 120, "y": 220, "w": 60, "h": 80},
        }
    ]

    try:
        alert = Alert(
            object_type=detections_payload[0]["label"],
            confidence=detections_payload[0]["confidence"],
            bbox=detections_payload[0]["bbox"],
            alert_level="high",
            image_url=image_url,
            user_id=user.id,
        )
        db.add(alert)
        await db.flush()

        detection_rows = [
            Detection(
                alert_id=alert.id,
                label=item["label"],
                confidence=item["confidence"],
                bbox=item["bbox"],
            )
            for item in detections_payload
        ]
        db.add_all(detection_rows)

        await db.commit()
        await db.refresh(alert)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to persist detection") from exc

    payload = {
        "id": str(alert.id),
        "object_type": alert.object_type,
        "confidence": alert.confidence,
        "bbox": alert.bbox,
        "alert_level": alert.alert_level,
        "image_url": alert.image_url,
    }

    asyncio.create_task(manager.broadcast(payload))

    return {
        "message": "Detection processed",
        "alert": payload,
        "detections": [
            {
                "label": item["label"],
                "confidence": item["confidence"],
                "bbox": item["bbox"],
            }
            for item in detections_payload
        ],
    }
