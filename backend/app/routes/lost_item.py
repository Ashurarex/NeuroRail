from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_token
from app.database import get_db
from app.models import LostFound, User
from app.schemas.lost_found import LostFoundOut
from app.services.lost_found_service import create_lost_found_case_record

router = APIRouter(tags=["Lost Found"])


@router.post("/lost-item", response_model=LostFoundOut)
async def create_lost_item(
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
    contents = await file.read()
    return await create_lost_found_case_record(
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
