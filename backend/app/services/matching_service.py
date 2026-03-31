from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Iterable
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import Detection, LostFound, LostFoundMatch
from app.services.image_embedding import cosine_similarity
from app.websocket.manager import match_manager

logger = logging.getLogger(__name__)

MATCH_THRESHOLD = 0.75
MATCH_WEIGHTS = {
    "image": 0.6,
    "label": 0.25,
    "metadata": 0.15,
}
TIME_WINDOW_HOURS = 12


def _normalize_label(label: str | None) -> str:
    if not label:
        return ""
    return " ".join(label.lower().strip().split())


def _label_match(case_label: str | None, detection_label: str | None) -> float:
    if not case_label or not detection_label:
        return 0.0
    case_norm = _normalize_label(case_label)
    det_norm = _normalize_label(detection_label)
    if case_norm == det_norm:
        return 1.0

    synonyms = {
        "bag": {"backpack", "handbag", "rucksack", "luggage"},
        "suitcase": {"luggage", "trolley"},
        "phone": {"mobile", "cell phone"},
    }
    for key, values in synonyms.items():
        if case_norm == key and det_norm in values:
            return 0.9
        if det_norm == key and case_norm in values:
            return 0.9

    if case_norm in det_norm or det_norm in case_norm:
        return 0.6
    return 0.0


def _metadata_score(case: LostFound, detection: Detection) -> float:
    scores: list[float] = []

    def normalize(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    if case.color and detection.attributes:
        det_color = str(detection.attributes.get("color", "")).lower()
        case_color = case.color.lower()
        if det_color and case_color:
            scores.append(1.0 if case_color in det_color or det_color in case_color else 0.0)

    if case.size and detection.attributes:
        det_size = str(detection.attributes.get("size", "")).lower()
        case_size = case.size.lower()
        if det_size and case_size:
            scores.append(1.0 if case_size in det_size or det_size in case_size else 0.0)

    if case.reported_at and detection.detected_at:
        diff = abs((normalize(case.reported_at) - normalize(detection.detected_at)).total_seconds())
        max_diff = TIME_WINDOW_HOURS * 3600
        if diff <= max_diff:
            scores.append(max(0.0, 1.0 - (diff / max_diff)))
        else:
            scores.append(0.0)

    if not scores:
        return 0.0
    return sum(scores) / len(scores)


def _compute_score(case: LostFound, detection: Detection) -> tuple[float, float, float, float]:
    image_similarity = 0.0
    if case.image_embedding and detection.image_embedding:
        image_similarity = cosine_similarity(case.image_embedding, detection.image_embedding)

    label_score = _label_match(case.object_type, detection.label)
    metadata_score = _metadata_score(case, detection)

    confidence = (
        image_similarity * MATCH_WEIGHTS["image"]
        + label_score * MATCH_WEIGHTS["label"]
        + metadata_score * MATCH_WEIGHTS["metadata"]
    )
    confidence = max(0.0, min(1.0, confidence))
    return confidence, image_similarity, label_score, metadata_score


async def _persist_matches(
    db: AsyncSession,
    case: LostFound,
    detections: Iterable[Detection],
) -> list[LostFoundMatch]:
    matches: list[LostFoundMatch] = []

    for detection in detections:
        confidence, image_similarity, label_score, metadata_score = _compute_score(case, detection)
        if confidence < MATCH_THRESHOLD:
            continue

        existing = await db.execute(
            select(LostFoundMatch)
            .where(LostFoundMatch.case_id == case.id)
            .where(LostFoundMatch.detection_id == detection.id)
        )
        if existing.scalar_one_or_none():
            continue

        match = LostFoundMatch(
            case_id=case.id,
            detection_id=detection.id,
            confidence=confidence,
            image_similarity=image_similarity,
            label_match=label_score,
            metadata_score=metadata_score,
            status="pending",
        )
        db.add(match)
        matches.append(match)

    if matches:
        case.status = "matched"

    return matches


async def _broadcast_matches(matches: list[LostFoundMatch]) -> None:
    for match in matches:
        payload = {
            "type": "MATCH",
            "case_id": str(match.case_id),
            "match_id": str(match.id),
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        }
        asyncio.create_task(match_manager.broadcast(payload))


async def generate_matches_for_case(case_id: UUID) -> None:
    async with AsyncSessionLocal() as db:
        case = await db.get(LostFound, case_id)
        if not case or not case.image_embedding:
            return

        detections_result = await db.execute(
            select(Detection).order_by(Detection.detected_at.desc())
        )
        detections = detections_result.scalars().all()

        matches = await _persist_matches(db, case, detections)
        if matches:
            await db.commit()
            for match in matches:
                await db.refresh(match)
            await _broadcast_matches(matches)
        else:
            await db.commit()


async def generate_matches_for_detections(detection_ids: list[UUID]) -> None:
    if not detection_ids:
        return

    async with AsyncSessionLocal() as db:
        detections_result = await db.execute(
            select(Detection).where(Detection.id.in_(detection_ids))
        )
        detections = detections_result.scalars().all()
        if not detections:
            return

        cases_result = await db.execute(
            select(LostFound)
            .where(LostFound.status.in_(["pending", "matched"]))
            .order_by(LostFound.reported_at.desc())
        )
        cases = cases_result.scalars().all()

        all_matches: list[LostFoundMatch] = []
        for case in cases:
            if not case.image_embedding:
                continue
            matches = await _persist_matches(db, case, detections)
            all_matches.extend(matches)

        if all_matches:
            await db.commit()
            for match in all_matches:
                await db.refresh(match)
            await _broadcast_matches(all_matches)
        else:
            await db.commit()
