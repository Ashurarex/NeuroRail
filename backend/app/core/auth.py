from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.db import models

SECRET = settings.JWT_SECRET
ALGORITHM = "HS256"

security = HTTPBearer()


# -------------------------
# 🔐 CREATE TOKEN
# -------------------------
def create_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=12)

    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


# -------------------------
# 🔍 VERIFY TOKEN
# -------------------------
def verify_token(token=Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token.credentials, SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")

        user = db.query(models.User).filter(models.User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return user

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# -------------------------
# 🛡️ ADMIN CHECK
# -------------------------
def verify_admin(user=Depends(verify_token)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user