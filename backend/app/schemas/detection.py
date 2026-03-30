from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DetectionBase(BaseModel):
    alert_id: UUID
    label: str
    confidence: float
    bbox: dict | None = None


class DetectionCreate(DetectionBase):
    pass


class DetectionUpdate(BaseModel):
    label: str | None = None
    confidence: float | None = None
    bbox: dict | None = None


class DetectionOut(DetectionBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
