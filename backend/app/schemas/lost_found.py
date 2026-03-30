from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LostFoundBase(BaseModel):
    status: str = "pending"
    location: str | None = None
    image_url: str | None = None
    user_id: UUID | None = None
    alert_id: UUID | None = None


class LostFoundStatusUpdate(BaseModel):
    status: str


class LostFoundOut(LostFoundBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
