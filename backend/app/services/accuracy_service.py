from __future__ import annotations

import asyncio
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Deque


@dataclass
class AccuracySnapshot:
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    total_detections: int
    correct: int
    incorrect: int
    timestamp: str


class AccuracyTracker:
    def __init__(self, window_size: int = 200) -> None:
        self._window_size = window_size
        self._outcomes: Deque[bool] = deque(maxlen=window_size)
        self._lock = asyncio.Lock()
        self._last_updated: datetime | None = None

    async def record(self, correct: bool) -> None:
        async with self._lock:
            self._outcomes.append(correct)
            self._last_updated = datetime.now(tz=timezone.utc)

    async def snapshot(self) -> AccuracySnapshot:
        async with self._lock:
            total = len(self._outcomes)
            correct = sum(1 for outcome in self._outcomes if outcome)
            incorrect = total - correct
            timestamp = (self._last_updated or datetime.now(tz=timezone.utc)).isoformat()

        accuracy = (correct / total) * 100 if total else 0.0
        precision = (correct / total) * 100 if total else 0.0
        recall = (correct / total) * 100 if total else 0.0
        f1_score = (
            (2 * precision * recall / (precision + recall))
            if (precision + recall) > 0
            else 0.0
        )

        return AccuracySnapshot(
            accuracy=round(accuracy, 2),
            precision=round(precision, 2),
            recall=round(recall, 2),
            f1_score=round(f1_score, 2),
            total_detections=total,
            correct=correct,
            incorrect=incorrect,
            timestamp=timestamp,
        )


accuracy_tracker = AccuracyTracker()


async def accuracy_broadcast_loop(
    manager,
    interval_seconds: float = 2.0,
) -> None:
    while True:
        snapshot = await accuracy_tracker.snapshot()
        await manager.broadcast({
            "type": "ACCURACY",
            "accuracy": snapshot.accuracy,
            "precision": snapshot.precision,
            "recall": snapshot.recall,
            "f1_score": snapshot.f1_score,
            "total_detections": snapshot.total_detections,
            "correct": snapshot.correct,
            "incorrect": snapshot.incorrect,
            "timestamp": snapshot.timestamp,
        })
        await asyncio.sleep(interval_seconds)
