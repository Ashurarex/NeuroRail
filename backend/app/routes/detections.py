from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_admin
from app.database import get_db
from app.models import Detection
from app.schemas.detection import DetectionCreate, DetectionOut, DetectionUpdate

router = APIRouter(prefix="/detections", tags=["Detections"])


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
