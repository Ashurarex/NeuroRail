from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.db import models

router = APIRouter(prefix="/reports", tags=["Reports"])


# -------------------------
# 📊 SUMMARY
# -------------------------
@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    total_alerts = db.query(func.count(models.Alert.id)).scalar()

    high_alerts = db.query(func.count(models.Alert.id))\
        .filter(models.Alert.alert_level == "high").scalar()

    medium_alerts = db.query(func.count(models.Alert.id))\
        .filter(models.Alert.alert_level == "medium").scalar()

    low_alerts = db.query(func.count(models.Alert.id))\
        .filter(models.Alert.alert_level == "low").scalar()

    return {
        "total": total_alerts,
        "high": high_alerts,
        "medium": medium_alerts,
        "low": low_alerts
    }


# -------------------------
# 📈 TIMELINE (per day)
# -------------------------
@router.get("/timeline")
def get_timeline(db: Session = Depends(get_db)):
    results = db.query(
        func.date(models.Alert.created_at),
        func.count(models.Alert.id)
    ).group_by(func.date(models.Alert.created_at)).all()

    return [
        {"date": str(r[0]), "count": r[1]}
        for r in results
    ]


# -------------------------
# 🎯 OBJECT DISTRIBUTION
# -------------------------
@router.get("/by-object")
def alerts_by_object(db: Session = Depends(get_db)):
    results = db.query(
        models.Alert.object_type,
        func.count(models.Alert.id)
    ).group_by(models.Alert.object_type).all()

    return [
        {"object": r[0], "count": r[1]}
        for r in results
    ]