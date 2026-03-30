from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PredictionBase(BaseModel):
    risk_level: str
    delay_probability: float
    congestion: float


class PredictionCreate(PredictionBase):
    pass


class PredictionUpdate(BaseModel):
    risk_level: str | None = None
    delay_probability: float | None = None
    congestion: float | None = None


class PredictionOut(PredictionBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
