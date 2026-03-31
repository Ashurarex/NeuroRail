import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class LostFoundMatch(Base):
    __tablename__ = "lost_found_matches"
    __table_args__ = (
        UniqueConstraint("case_id", "detection_id", name="uq_lost_found_match"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lost_found.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    detection_id = Column(
        UUID(as_uuid=True),
        ForeignKey("detections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    confidence = Column(Float, nullable=False)
    image_similarity = Column(Float, nullable=False)
    label_match = Column(Float, nullable=False)
    metadata_score = Column(Float, nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    match_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    case = relationship("LostFound", back_populates="matches")
    detection = relationship("Detection", back_populates="matches")
