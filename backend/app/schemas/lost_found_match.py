from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MatchDetectionOut(BaseModel):
    id: UUID
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

    model_config = ConfigDict(from_attributes=True)


class LostFoundMatchOut(BaseModel):
    id: UUID
    case_id: UUID
    detection: MatchDetectionOut
    confidence: float
    image_similarity: float
    label_match: float
    metadata_score: float
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LostFoundMatchStatusUpdate(BaseModel):
    status: str
    match_notes: str | None = None
