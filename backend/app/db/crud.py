from sqlalchemy.orm import Session
from app.db import models


# -------------------------
# ALERT CRUD
# -------------------------

def create_alert(db: Session, data: dict):
    alert = models.Alert(
        object_type=data.get("object_type"),
        confidence=data.get("confidence"),
        bbox=data.get("bbox"),
        alert_level=data.get("alert_level"),
        user_id=data.get("user_id"),
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    return alert


def get_alerts(db: Session):
    return db.query(models.Alert).order_by(models.Alert.created_at.desc()).all()


# -------------------------
# PREDICTION CRUD
# -------------------------

def create_prediction(db: Session, data: dict):
    prediction = models.Prediction(
        risk_level=data.get("risk_level"),
        delay_probability=data.get("delay_probability"),
        congestion=data.get("congestion"),
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return prediction