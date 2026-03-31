from __future__ import annotations

from dataclasses import dataclass

from app.services.behavior_analysis import BehaviorSummary


@dataclass
class PredictionResult:
    incident_risk: float
    type: str
    confidence: int


def predict_incident(summary: BehaviorSummary) -> PredictionResult:
    crowd_factor = min(summary.crowd_count / 10, 1.0)
    suspicious_factor = min(summary.suspicious_behaviors / 5, 1.0)
    abandoned_factor = min(summary.abandoned_objects / 3, 1.0)

    incident_risk = 0.1 + (0.3 * crowd_factor) + (0.4 * suspicious_factor) + (0.4 * abandoned_factor)
    incident_risk = min(1.0, incident_risk)

    if summary.abandoned_objects > 0:
        incident_type = "potential unattended baggage"
    elif summary.crowd_alert:
        incident_type = "crowd surge"
    elif summary.suspicious_behaviors > 0:
        incident_type = "suspicious behavior"
    else:
        incident_type = "normal"

    confidence = int(round(incident_risk * 100))
    return PredictionResult(
        incident_risk=round(incident_risk, 2),
        type=incident_type,
        confidence=confidence,
    )
