import asyncio
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_admin, verify_token
from app.database import get_db
from app.models import LostFound, User
from app.schemas.lost_found import LostFoundOut, LostFoundStatusUpdate

router = APIRouter(prefix="/lost-found", tags=["Lost Found"])

UPLOAD_DIR = Path("uploads") / "lost-found"


@router.post("", response_model=LostFoundOut)
async def create_lost_found_case(
    file: UploadFile = File(...),
    location: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(verify_token),
) -> LostFound:
    try:
        print(f"Creating lost & found case for user: {user.id} ({user.email})")
        contents = await file.read()

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        saved_name = f"{user.id}_{file.filename}"
        file_path = UPLOAD_DIR / saved_name
        await asyncio.to_thread(file_path.write_bytes, contents)
        image_url = f"/{file_path.as_posix()}"

        record = LostFound(
            user_id=user.id,
            location=location.strip() if location else None,
            image_url=image_url,
            status="pending",
        )

        db.add(record)
        await db.commit()
        await db.refresh(record)
        print(f"Lost & found case created: {record.id}")
        return record
    except Exception as exc:
        print(f"Error creating lost & found case: {exc}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create lost and found case: {str(exc)}") from exc


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
