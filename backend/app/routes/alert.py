from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_admin
from app.database import get_db
from app.models import Alert
from app.schemas.alert import AlertCreate, AlertOut, AlertUpdate

router = APIRouter(tags=["Alerts"])


@router.get("/alerts", response_model=list[AlertOut])
async def fetch_alerts(
    severity: str | None = Query(None),
    object_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[Alert]:
    query = select(Alert)

    if severity:
        query = query.where(Alert.alert_level == severity)
    if object_type:
        query = query.where(Alert.object_type == object_type)

    query = query.order_by(Alert.created_at.desc())
    result = await db.execute(query)
    alerts = result.scalars().all()

    return alerts


@router.post("/alerts", response_model=AlertOut)
async def create_alert(
    payload: AlertCreate,
    _: Any = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> Alert:
    alert = Alert(**payload.model_dump())
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


@router.get("/alerts/{alert_id}", response_model=AlertOut)
async def get_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> Alert:
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.put("/alerts/{alert_id}", response_model=AlertOut)
async def update_alert(
    alert_id: UUID,
    payload: AlertUpdate,
    _: Any = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> Alert:
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(alert, key, value)

    await db.commit()
    await db.refresh(alert)
    return alert


@router.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: UUID,
    _: Any = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
    await db.commit()
    return {"status": "deleted"}
