from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Alert

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)) -> dict[str, int]:
    total = (await db.execute(select(func.count(Alert.id)))).scalar_one()
    high = (await db.execute(select(func.count(Alert.id)).where(Alert.alert_level == "high"))).scalar_one()
    medium = (await db.execute(select(func.count(Alert.id)).where(Alert.alert_level == "medium"))).scalar_one()
    low = (await db.execute(select(func.count(Alert.id)).where(Alert.alert_level == "low"))).scalar_one()

    return {"total": total, "high": high, "medium": medium, "low": low}


@router.get("/timeline")
async def get_timeline(db: AsyncSession = Depends(get_db)) -> list[dict[str, int | str]]:
    stmt = (
        select(func.date(Alert.created_at), func.count(Alert.id))
        .group_by(func.date(Alert.created_at))
        .order_by(func.date(Alert.created_at))
    )
    results = (await db.execute(stmt)).all()
    return [{"date": str(row[0]), "count": row[1]} for row in results]


@router.get("/by-object")
async def alerts_by_object(db: AsyncSession = Depends(get_db)) -> list[dict[str, int | str]]:
    stmt = select(Alert.object_type, func.count(Alert.id)).group_by(Alert.object_type)
    results = (await db.execute(stmt)).all()
    return [{"object": row[0], "count": row[1]} for row in results]
