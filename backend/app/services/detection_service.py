from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from app.services.alert_service import build_alert_payload, handle_alerts
from app.services.behavior_analysis import analyze_behavior
from app.services.prediction_service import predict_incident
from app.websocket.manager import intel_manager


async def process_detection_batch(
    *,
    camera_id: str,
    location: str | None,
    detections: list[dict[str, Any]],
    timestamp: datetime | None = None,
) -> None:
    if not detections:
        return

    ts = timestamp or datetime.now(tz=timezone.utc)
    summary = analyze_behavior(
        camera_id=camera_id,
        location=location,
        detections=detections,
        timestamp=ts,
    )
    prediction = predict_incident(summary)
    alert_payload = build_alert_payload(
        camera_id=camera_id,
        location=location,
        incident_risk=prediction.incident_risk,
        incident_type=prediction.type,
    )

    payloads = [
        {
            "type": "BEHAVIOR",
            "camera_id": summary.camera_id,
            "location": summary.location,
            "timestamp": summary.timestamp,
            "risk_score": summary.risk_score,
            "crowd_count": summary.crowd_count,
            "crowd_alert": summary.crowd_alert,
            "abandoned_objects": summary.abandoned_objects,
            "suspicious_behaviors": summary.suspicious_behaviors,
            "tracks": [
                {
                    "id": track.id,
                    "duration_in_frame": round(track.duration_in_frame, 2),
                    "movement_pattern": track.movement_pattern,
                    "risk_score": round(track.risk_score, 2),
                    "bbox": track.bbox,
                }
                for track in summary.tracks
            ],
        },
        {
            "type": "PREDICTION",
            "camera_id": summary.camera_id,
            "location": summary.location,
            "timestamp": summary.timestamp,
            "incident_risk": prediction.incident_risk,
            "incident_type": prediction.type,
            "confidence": prediction.confidence,
        },
    ]

    if alert_payload:
        payloads.append(alert_payload)
        await handle_alerts(alert_payload)

    await intel_manager.broadcast_batch(payloads)


async def queue_detection_processing(
    *,
    camera_id: str,
    location: str | None,
    detections: list[dict[str, Any]],
    timestamp: datetime | None = None,
) -> None:
    asyncio.create_task(
        process_detection_batch(
            camera_id=camera_id,
            location=location,
            detections=detections,
            timestamp=timestamp,
        )
    )
