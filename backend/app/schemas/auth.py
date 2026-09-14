import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserRegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=255)
    grade: str | None = None
    goal: str | None = None
    target: str | None = None


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str
    grade: str | None
    goal: str | None
    target: str | None
    subscription_active: bool
    subscription_expires_at: datetime | None

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    user: UserOut
    token: TokenOut
