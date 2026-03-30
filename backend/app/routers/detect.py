from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session

from app.core.auth import verify_token
from app.db.database import get_db
from app.services.alert_service import create_alert
from app.services.supabase_client import upload_image

router = APIRouter()


@router.post("/detect")
async def detect(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(verify_token)
):
    """
    Handles file upload → stores image → triggers alert
    """

    # -------------------------
    # Read file
    # -------------------------
    contents = await file.read()

    # -------------------------
    # Upload to Supabase
    # -------------------------
    image_url = upload_image(contents, file.filename)

    # -------------------------
    # Fake detection (replace with YOLO)
    # -------------------------
    detected_object = "person"

    alert = await create_alert(
        db=db,
        object_type=detected_object,
        confidence=0.93,
        bbox={"x": 120, "y": 220, "w": 60, "h": 80},
        alert_level="high",
        image_url=image_url
    )

    return {
        "message": "Detection processed",
        "alert": alert
    }