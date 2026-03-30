from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    phone: str | None = Field(default=None, pattern=r"^\+?[0-9]{10,15}$")
    is_admin: bool = False


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: str | None = None


class UserSummary(BaseModel):
    id: str
    email: str
    role: str
    status: str
    last_login: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str