from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DetectionBase(BaseModel):
    alert_id: UUID | None = None
    label: str
    confidence: float
    bbox: dict | None = None
    camera_id: str | None = None
    location: str | None = None
    detected_at: datetime | None = None
    image_url: str | None = None
    snapshot_url: str | None = None
    attributes: dict | None = None
    frame_width: int | None = None
    frame_height: int | None = None


class DetectionCreate(DetectionBase):
    pass


class DetectionUpdate(BaseModel):
    label: str | None = None
    confidence: float | None = None
    bbox: dict | None = None
    camera_id: str | None = None
    location: str | None = None
    detected_at: datetime | None = None
    image_url: str | None = None
    snapshot_url: str | None = None
    attributes: dict | None = None
    frame_width: int | None = None
    frame_height: int | None = None


class DetectionIngestItem(BaseModel):
    label: str
    confidence: float
    bbox: dict | None = None
    detected_at: datetime | None = None
    attributes: dict | None = None


class DetectionOut(DetectionBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
