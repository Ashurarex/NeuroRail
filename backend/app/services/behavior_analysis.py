from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from math import hypot
from typing import Any


@dataclass
class TrackSnapshot:
    id: int
    duration_in_frame: float
    movement_pattern: str
    risk_score: float
    bbox: dict[str, float]


@dataclass
class BehaviorSummary:
    camera_id: str
    location: str | None
    timestamp: str
    tracks: list[TrackSnapshot]
    crowd_count: int
    crowd_alert: bool
    abandoned_objects: int
    suspicious_behaviors: int
    risk_score: float


class TrackState:
    def __init__(self, track_id: int, bbox: dict[str, float], now: datetime) -> None:
        self.id = track_id
        self.first_seen = now
        self.last_seen = now
        self.last_bbox = bbox
        self.last_centroid = _centroid(bbox)
        self.last_speed = 0.0

    def update(self, bbox: dict[str, float], now: datetime) -> None:
        dt = max(0.001, (now - self.last_seen).total_seconds())
        new_centroid = _centroid(bbox)
        dist = hypot(new_centroid[0] - self.last_centroid[0], new_centroid[1] - self.last_centroid[1])
        self.last_speed = dist / dt
        self.last_centroid = new_centroid
        self.last_bbox = bbox
        self.last_seen = now

    @property
    def duration(self) -> float:
        return (self.last_seen - self.first_seen).total_seconds()


class BagState:
    def __init__(self, bag_id: int, bbox: dict[str, float], now: datetime) -> None:
        self.id = bag_id
        self.first_seen = now
        self.last_seen = now
        self.last_bbox = bbox
        self.unattended_since: datetime | None = None

    def update(self, bbox: dict[str, float], now: datetime) -> None:
        self.last_bbox = bbox
        self.last_seen = now


class CameraState:
    def __init__(self) -> None:
        self.tracks: dict[int, TrackState] = {}
        self.bags: dict[int, BagState] = {}
        self.next_track_id = 1
        self.next_bag_id = 1
        self.last_person_count = 0


_STATES: dict[str, CameraState] = {}

_PERSON_LABELS = {"person", "people", "human"}
_BAG_LABELS = {"bag", "backpack", "suitcase", "luggage", "handbag"}


def _centroid(bbox: dict[str, float]) -> tuple[float, float]:
    return (bbox.get("x", 0.0) + bbox.get("w", 0.0) / 2, bbox.get("y", 0.0) + bbox.get("h", 0.0) / 2)


def _distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return hypot(a[0] - b[0], a[1] - b[1])


def _match_track(states: dict[int, TrackState], bbox: dict[str, float], max_distance: float = 90) -> TrackState | None:
    if not states:
        return None
    centroid = _centroid(bbox)
    best = None
    best_dist = None
    for state in states.values():
        dist = _distance(centroid, state.last_centroid)
        if dist <= max_distance and (best_dist is None or dist < best_dist):
            best = state
            best_dist = dist
    return best


def _match_bag(states: dict[int, BagState], bbox: dict[str, float], max_distance: float = 120) -> BagState | None:
    if not states:
        return None
    centroid = _centroid(bbox)
    best = None
    best_dist = None
    for state in states.values():
        dist = _distance(centroid, _centroid(state.last_bbox))
        if dist <= max_distance and (best_dist is None or dist < best_dist):
            best = state
            best_dist = dist
    return best


def analyze_behavior(
    *,
    camera_id: str,
    location: str | None,
    detections: list[dict[str, Any]],
    timestamp: datetime | None = None,
) -> BehaviorSummary:
    now = timestamp or datetime.now(tz=timezone.utc)
    state = _STATES.setdefault(camera_id, CameraState())

    person_detections = [d for d in detections if str(d.get("label", "")).lower() in _PERSON_LABELS]
    bag_detections = [d for d in detections if str(d.get("label", "")).lower() in _BAG_LABELS]

    active_tracks: dict[int, TrackState] = {}
    for det in person_detections:
        bbox = det.get("bbox") or {}
        match = _match_track(state.tracks, bbox)
        if match:
            match.update(bbox, now)
            active_tracks[match.id] = match
        else:
            track = TrackState(state.next_track_id, bbox, now)
            state.tracks[track.id] = track
            active_tracks[track.id] = track
            state.next_track_id += 1

    active_bags: dict[int, BagState] = {}
    for det in bag_detections:
        bbox = det.get("bbox") or {}
        match = _match_bag(state.bags, bbox, max_distance=120)
        if match:
            match.update(bbox, now)
            active_bags[match.id] = match
        else:
            bag = BagState(state.next_bag_id, bbox, now)
            state.bags[bag.id] = bag
            active_bags[bag.id] = bag
            state.next_bag_id += 1

    state.tracks = active_tracks
    state.bags = active_bags

    crowd_count = len(active_tracks)
    crowd_alert = crowd_count >= 8 and crowd_count >= int(state.last_person_count * 1.5) if state.last_person_count else False
    state.last_person_count = crowd_count

    suspicious_behaviors = 0
    abandoned_objects = 0
    track_snapshots: list[TrackSnapshot] = []

    for track in active_tracks.values():
        duration = track.duration
        speed = track.last_speed
        movement_pattern = "normal"
        risk_score = 0.1

        if duration >= 30 and speed < 20:
            movement_pattern = "loitering"
            risk_score += 0.5
        if speed > 250:
            movement_pattern = "running"
            risk_score += 0.4

        risk_score = min(1.0, risk_score)
        if movement_pattern != "normal":
            suspicious_behaviors += 1

        track_snapshots.append(
            TrackSnapshot(
                id=track.id,
                duration_in_frame=duration,
                movement_pattern=movement_pattern,
                risk_score=risk_score,
                bbox=track.last_bbox,
            )
        )

    person_centroids = [track.last_centroid for track in active_tracks.values()]
    for bag in active_bags.values():
        bag_centroid = _centroid(bag.last_bbox)
        near_person = any(_distance(bag_centroid, person) < 150 for person in person_centroids)
        if near_person:
            bag.unattended_since = None
        else:
            if bag.unattended_since is None:
                bag.unattended_since = now
            unattended_duration = (now - bag.unattended_since).total_seconds()
            if unattended_duration >= 30:
                abandoned_objects += 1

    if crowd_alert:
        suspicious_behaviors += 1

    risk_score = min(1.0, (suspicious_behaviors / 5) + (abandoned_objects * 0.2))

    return BehaviorSummary(
        camera_id=camera_id,
        location=location,
        timestamp=now.isoformat(),
        tracks=track_snapshots,
        crowd_count=crowd_count,
        crowd_alert=crowd_alert,
        abandoned_objects=abandoned_objects,
        suspicious_behaviors=suspicious_behaviors,
        risk_score=risk_score,
    )
