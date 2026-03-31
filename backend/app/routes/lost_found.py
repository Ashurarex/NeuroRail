from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_admin, verify_token
from app.database import get_db
from app.models import LostFound, User
from app.schemas.lost_found import LostFoundOut, LostFoundStatusUpdate
from app.services.lost_found_service import create_lost_found_case_record

router = APIRouter(prefix="/lost-found", tags=["Lost Found"])


@router.post("", response_model=LostFoundOut)
async def create_lost_found_case(
    file: UploadFile = File(...),
    location: str | None = Form(None),
    object_type: str | None = Form(None),
    description: str | None = Form(None),
    color: str | None = Form(None),
    size: str | None = Form(None),
    reported_at: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(verify_token),
) -> LostFound:
    try:
        contents = await file.read()
        record = await create_lost_found_case_record(
            db=db,
            user=user,
            image_bytes=contents,
            filename=file.filename,
            location=location,
            object_type=object_type,
            description=description,
            color=color,
            size=size,
            reported_at_raw=reported_at,
        )
        return record
    except HTTPException:
        raise


@router.get("/admin", response_model=list[LostFoundOut])
async def list_lost_found_admin(
    status: str | None = None,
    _: Any = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> list[LostFound]:
    query = select(LostFound).order_by(LostFound.created_at.desc())
    if status:
        query = query.where(LostFound.status == status)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/mine", response_model=list[LostFoundOut])
async def list_lost_found_mine(
    user: User = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
) -> list[LostFound]:
    result = await db.execute(
        select(LostFound)
        .where(LostFound.user_id == user.id)
        .order_by(LostFound.created_at.desc())
    )
    return result.scalars().all()


@router.get("/admin/{case_id}", response_model=LostFoundOut)
async def get_lost_found_admin(
    case_id: UUID,
    _: Any = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> LostFound:
    result = await db.execute(select(LostFound).where(LostFound.id == case_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Lost and found case not found")
    return record


@router.patch("/admin/{case_id}", response_model=LostFoundOut)
async def update_lost_found_status(
    case_id: UUID,
    payload: LostFoundStatusUpdate,
    _: Any = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> LostFound:
    result = await db.execute(select(LostFound).where(LostFound.id == case_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Lost and found case not found")

    record.status = payload.status
    await db.commit()
    await db.refresh(record)
    return record
