from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import create_token
from app.database import get_db
from app.models import User
from app.schemas.auth import TokenResponse, UserCreate, UserLogin

router = APIRouter(prefix="/auth", tags=["Auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


@router.post("/register", response_model=TokenResponse)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == user.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_user = User(
        email=user.email,
        password=hash_password(user.password),
        is_admin=user.is_admin,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    token = create_token({"user_id": str(new_user.id), "is_admin": new_user.is_admin})
    role = "admin" if new_user.is_admin else "user"
    return TokenResponse(access_token=token, role=role)


@router.post("/login", response_model=TokenResponse)
async def login(user: UserLogin, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == user.email))
    db_user = result.scalar_one_or_none()

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    requested_role = user.role or ("admin" if db_user.is_admin else "user")
    if requested_role == "admin" and not db_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    token = create_token({"user_id": str(db_user.id), "is_admin": db_user.is_admin})
    role = "admin" if db_user.is_admin else "user"
    return TokenResponse(access_token=token, role=role)
