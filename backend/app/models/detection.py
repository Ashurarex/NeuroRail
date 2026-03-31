import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Detection(Base):
    __tablename__ = "detections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_id = Column(
        UUID(as_uuid=True),
        ForeignKey("alerts.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    label = Column(String(120), nullable=False)
    confidence = Column(Float, nullable=False)
    bbox = Column(JSON, nullable=True)

    camera_id = Column(String(120), nullable=True, index=True)
    location = Column(Text, nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    image_url = Column(Text, nullable=True)
    snapshot_url = Column(Text, nullable=True)
    image_embedding = Column(JSON, nullable=True)
    attributes = Column(JSON, nullable=True)
    frame_width = Column(Integer, nullable=True)
    frame_height = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    alert = relationship("Alert", back_populates="detections")
    matches = relationship("LostFoundMatch", back_populates="detection", cascade="all, delete-orphan")
