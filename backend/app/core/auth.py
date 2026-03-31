from datetime import datetime, timedelta
from uuid import UUID, uuid5, NAMESPACE_DNS

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.database import get_db
from app.models import User

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


async def _resolve_user_from_payload(payload: dict, db: AsyncSession) -> User:
    user_id = payload.get("user_id")
    is_admin = payload.get("is_admin", False)

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Support demo users for development/testing
    if isinstance(user_id, str) and user_id.startswith("demo-"):
        email = user_id.replace("demo-", "")
        demo_uuid = uuid5(NAMESPACE_DNS, f"demo-{email}")

        print(f"🔐 Processing demo user: {email}")

        try:
            result = await db.execute(select(User).where(User.email == email))
            demo_user = result.scalar_one_or_none()

            if demo_user:
                print(f"✓ Demo user found in database: {email} (ID: {demo_user.id})")
                return demo_user

        except Exception as query_exc:
            print(f"❌ Error querying demo user by email: {query_exc}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(query_exc)}")

        print(f"Creating new demo user: {email}")
        demo_user = User(
            id=demo_uuid,
            email=email,
            password="demo",
            is_admin=is_admin,
        )
        db.add(demo_user)

        try:
            await db.commit()
            await db.refresh(demo_user)
            print(f"✅ Demo user created successfully: {email} (ID: {demo_uuid})")
            return demo_user

        except IntegrityError as integrity_exc:
            print(f"⚠️ Demo user creation failed due to race condition: {integrity_exc}")
            await db.rollback()

            try:
                result = await db.execute(select(User).where(User.email == email))
                demo_user = result.scalar_one_or_none()

                if demo_user:
                    print(f"✓ Retrieved demo user after race condition: {email}")
                    return demo_user
                else:
                    print("❌ Could not find demo user after race condition")
                    raise HTTPException(status_code=500, detail="Failed to create or find demo user")

            except Exception as retry_exc:
                print(f"❌ Error retrying demo user fetch: {retry_exc}")
                raise HTTPException(status_code=500, detail=f"Database error: {str(retry_exc)}")

        except Exception as create_exc:
            print(f"❌ Error creating demo user: {create_exc}")
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create demo user: {str(create_exc)}")

    try:
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
        result = await db.execute(select(User).where(User.id == user_uuid))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return user
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID format")


# -------------------------
# 🔍 VERIFY TOKEN
# -------------------------
async def verify_token(token=Depends(security), db: AsyncSession = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token.credentials, SECRET, algorithms=[ALGORITHM])
        return await _resolve_user_from_payload(payload, db)

    except HTTPException:
        raise
    except JWTError as jwt_exc:
        print(f"JWT decode error: {jwt_exc}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as exc:
        print(f"Unexpected error in verify_token: {exc}")
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(exc)}")


# -------------------------
# 🛡️ ADMIN CHECK
# -------------------------
async def verify_admin(user: User = Depends(verify_token)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def verify_admin_token(token_value: str, db: AsyncSession) -> User:
    try:
        payload = jwt.decode(token_value, SECRET, algorithms=[ALGORITHM])
        user = await _resolve_user_from_payload(payload, db)
        if not user.is_admin:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except HTTPException:
        raise
    except JWTError as jwt_exc:
        print(f"JWT decode error: {jwt_exc}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as exc:
        print(f"Unexpected error in verify_admin_token: {exc}")
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(exc)}")