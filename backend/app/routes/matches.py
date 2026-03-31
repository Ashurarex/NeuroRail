from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import verify_admin
from app.database import get_db
from app.models import LostFound, LostFoundMatch
from app.schemas.lost_found_match import LostFoundMatchOut, LostFoundMatchStatusUpdate
from app.services.accuracy_service import accuracy_tracker

router = APIRouter(prefix="/matches", tags=["Lost Found Matches"])


@router.get("/{case_id}", response_model=list[LostFoundMatchOut])
async def list_matches_for_case(
    case_id: UUID,
    _: object = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> list[LostFoundMatch]:
    result = await db.execute(
        select(LostFoundMatch)
        .options(selectinload(LostFoundMatch.detection))
        .where(LostFoundMatch.case_id == case_id)
        .order_by(LostFoundMatch.confidence.desc())
    )
    return result.scalars().all()


@router.patch("/match/{match_id}", response_model=LostFoundMatchOut)
async def update_match_status(
    match_id: UUID,
    payload: LostFoundMatchStatusUpdate,
    _: object = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> LostFoundMatch:
    allowed = {"pending", "verified", "rejected"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid match status")

    result = await db.execute(
        select(LostFoundMatch)
        .options(selectinload(LostFoundMatch.detection))
        .where(LostFoundMatch.id == match_id)
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    match.status = payload.status
    match.match_notes = payload.match_notes

    if payload.status in {"verified", "rejected"}:
        await accuracy_tracker.record(payload.status == "verified")

    case = await db.get(LostFound, match.case_id)
    if case and payload.status == "verified":
        case.status = "verified"

    await db.commit()
    await db.refresh(match)
    return match
