from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_admin
from app.database import get_db
from app.models import Prediction
from app.schemas.prediction import PredictionCreate, PredictionOut, PredictionUpdate

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.get("", response_model=list[PredictionOut])
async def list_predictions(
    _: object = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> list[Prediction]:
    result = await db.execute(select(Prediction).order_by(Prediction.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=PredictionOut)
async def create_prediction(
    payload: PredictionCreate,
    _: object = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> Prediction:
    prediction = Prediction(**payload.model_dump())
    db.add(prediction)
    await db.commit()
    await db.refresh(prediction)
    return prediction


@router.get("/{prediction_id}", response_model=PredictionOut)
async def get_prediction(
    prediction_id: UUID,
    _: object = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> Prediction:
    result = await db.execute(select(Prediction).where(Prediction.id == prediction_id))
    prediction = result.scalar_one_or_none()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return prediction


@router.put("/{prediction_id}", response_model=PredictionOut)
async def update_prediction(
    prediction_id: UUID,
    payload: PredictionUpdate,
    _: object = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> Prediction:
    result = await db.execute(select(Prediction).where(Prediction.id == prediction_id))
    prediction = result.scalar_one_or_none()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(prediction, key, value)

    await db.commit()
    await db.refresh(prediction)
    return prediction


@router.delete("/{prediction_id}")
async def delete_prediction(
    prediction_id: UUID,
    _: object = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    result = await db.execute(select(Prediction).where(Prediction.id == prediction_id))
    prediction = result.scalar_one_or_none()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    await db.delete(prediction)
    await db.commit()
    return {"status": "deleted"}
