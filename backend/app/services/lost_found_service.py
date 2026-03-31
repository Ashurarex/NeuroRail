from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import LostFound, User
from app.services.image_embedding import compute_embedding_from_bytes
from app.services.matching_service import generate_matches_for_case

UPLOAD_DIR = Path("uploads") / "lost-found"


def _parse_reported_at(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        return None


async def create_lost_found_case_record(
    *,
    db: AsyncSession,
    user: User,
    image_bytes: bytes,
    filename: str,
    location: str | None,
    object_type: str | None,
    description: str | None,
    color: str | None,
    size: str | None,
    reported_at_raw: str | None,
) -> LostFound:
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        saved_name = f"{user.id}_{filename}"
        file_path = UPLOAD_DIR / saved_name
        await asyncio.to_thread(file_path.write_bytes, image_bytes)
        image_url = f"/{file_path.as_posix()}"

        embedding = compute_embedding_from_bytes(image_bytes)
        reported_at = _parse_reported_at(reported_at_raw) or datetime.now(tz=timezone.utc)

        record = LostFound(
            user_id=user.id,
            location=location.strip() if location else None,
            image_url=image_url,
            object_type=object_type.strip() if object_type else None,
            description=description.strip() if description else None,
            color=color.strip() if color else None,
            size=size.strip() if size else None,
            reported_at=reported_at,
            image_embedding=embedding,
            status="pending",
        )

        db.add(record)
        await db.commit()
        await db.refresh(record)

        asyncio.create_task(generate_matches_for_case(record.id))
        return record
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create lost and found case: {exc}") from exc
