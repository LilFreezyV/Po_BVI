from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.auth import RegisterResponse, TokenOut, UserOut, UserRegisterIn
from app.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegisterIn, session: AsyncSession = Depends(get_db)) -> RegisterResponse:
    existing = await session.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь с таким email уже существует")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        name=payload.name,
        grade=payload.grade,
        goal=payload.goal,
        target=payload.target,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    token = create_access_token(str(user.id))
    return RegisterResponse(user=UserOut.model_validate(user), token=TokenOut(access_token=token))


@router.post("/login", response_model=TokenOut)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), session: AsyncSession = Depends(get_db)
) -> TokenOut:
    user = await session.scalar(select(User).where(User.email == form_data.username))
    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный email или пароль")
    return TokenOut(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)
