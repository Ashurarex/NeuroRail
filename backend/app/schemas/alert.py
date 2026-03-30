from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AlertBase(BaseModel):
    object_type: str
    confidence: float
    bbox: dict | None = None
    alert_level: str = "medium"
    image_url: str | None = None
    user_id: UUID | None = None


class AlertCreate(AlertBase):
    pass


class AlertUpdate(BaseModel):
    object_type: str | None = None
    confidence: float | None = None
    bbox: dict | None = None
    alert_level: str | None = None
    image_url: str | None = None
    user_id: UUID | None = None


class AlertOut(AlertBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
