import asyncio
import io
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_admin
from app.database import get_db
from app.models import Detection
from app.schemas.detection import (
    DetectionCreate,
    DetectionIngestItem,
    DetectionOut,
    DetectionUpdate,
)
from app.services.image_embedding import compute_embedding_from_image
from app.services.location_service import resolve_location
from app.services.matching_service import generate_matches_for_detections
from app.services.detection_service import queue_detection_processing

router = APIRouter(prefix="/detections", tags=["Detections"])

UPLOAD_DIR = Path("uploads") / "detections"
FRAME_DIR = UPLOAD_DIR / "frames"
SNAPSHOT_DIR = UPLOAD_DIR / "snapshots"


def _parse_datetime(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        return None


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _safe_crop(image: Image.Image, bbox: dict | None) -> Image.Image:
    if not bbox:
        return image.copy()

    x = int(max(0, bbox.get("x", 0)))
    y = int(max(0, bbox.get("y", 0)))
    w = int(max(1, bbox.get("w", 0)))
    h = int(max(1, bbox.get("h", 0)))
    right = min(image.width, x + w)
    bottom = min(image.height, y + h)
    return image.crop((x, y, right, bottom))


@router.get("", response_model=list[DetectionOut])
async def list_detections(
    _: object = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> list[Detection]:
    result = await db.execute(select(Detection).order_by(Detection.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=DetectionOut)
async def create_detection(
    payload: DetectionCreate,
    _: object = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> Detection:
    detection = Detection(**payload.model_dump())
    db.add(detection)
    await db.commit()
    await db.refresh(detection)
    return detection


@router.post("/ingest", response_model=list[DetectionOut])
async def ingest_detections(
    file: UploadFile = File(...),
    camera_id: str = Form(...),
    location: str | None = Form(None),
    detected_at: str | None = Form(None),
    detections: str = Form(...),
    _: object = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> list[Detection]:
    try:
        payload = json.loads(detections)
        items = [DetectionIngestItem(**item) for item in payload]
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid detections payload: {exc}") from exc

    if not items:
        return []

    image_bytes = await file.read()
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}") from exc

    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)

    frame_id = uuid.uuid4()
    frame_path = FRAME_DIR / f"frame_{frame_id}.jpg"
    await asyncio.to_thread(image.save, frame_path, "JPEG", quality=90)
    frame_url = f"/{frame_path.as_posix()}"

    detected_at_value = _parse_datetime(detected_at) or datetime.now(tz=timezone.utc)
    resolved_location = resolve_location(camera_id, location)

    detection_rows: list[Detection] = []
    detection_ids: list[UUID] = []
    behavior_payloads: list[dict[str, object]] = []

    for item in items:
        detection_id = uuid.uuid4()
        crop = await asyncio.to_thread(_safe_crop, image, item.bbox)
        snapshot_path = SNAPSHOT_DIR / f"det_{detection_id}.jpg"
        await asyncio.to_thread(crop.save, snapshot_path, "JPEG", quality=90)
        snapshot_url = f"/{snapshot_path.as_posix()}"

        embedding = compute_embedding_from_image(crop)
        detection_time = _normalize_datetime(item.detected_at or detected_at_value)

        detection = Detection(
            id=detection_id,
            alert_id=None,
            label=item.label,
            confidence=item.confidence,
            bbox=item.bbox,
            camera_id=camera_id,
            location=resolved_location,
            detected_at=detection_time,
            image_url=frame_url,
            snapshot_url=snapshot_url,
            image_embedding=embedding,
            attributes=item.attributes,
            frame_width=image.width,
            frame_height=image.height,
        )
        detection_rows.append(detection)
        detection_ids.append(detection_id)
        behavior_payloads.append(
            {
                "label": item.label,
                "confidence": item.confidence,
                "bbox": item.bbox,
                "attributes": item.attributes,
            }
        )

    db.add_all(detection_rows)
    await db.commit()

    for row in detection_rows:
        await db.refresh(row)

    asyncio.create_task(generate_matches_for_detections(detection_ids))
    await queue_detection_processing(
        camera_id=camera_id,
        location=resolved_location,
        detections=behavior_payloads,
        timestamp=detected_at_value,
    )
    return detection_rows


@router.get("/{detection_id}", response_model=DetectionOut)
async def get_detection(
    detection_id: UUID,
    _: object = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> Detection:
    result = await db.execute(select(Detection).where(Detection.id == detection_id))
    detection = result.scalar_one_or_none()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    return detection


@router.put("/{detection_id}", response_model=DetectionOut)
async def update_detection(
    detection_id: UUID,
    payload: DetectionUpdate,
    _: object = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> Detection:
    result = await db.execute(select(Detection).where(Detection.id == detection_id))
    detection = result.scalar_one_or_none()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(detection, key, value)

    await db.commit()
    await db.refresh(detection)
    return detection


@router.delete("/{detection_id}")
async def delete_detection(
    detection_id: UUID,
    _: object = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    result = await db.execute(select(Detection).where(Detection.id == detection_id))
    detection = result.scalar_one_or_none()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    await db.delete(detection)
    await db.commit()
    return {"status": "deleted"}
