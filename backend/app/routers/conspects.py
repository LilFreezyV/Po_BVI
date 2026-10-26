from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.content import Conspect
from app.models.enums import SubjectEnum
from app.models.user import User
from app.schemas.content import ConspectOut
from app.security import get_current_user_optional

router = APIRouter(prefix="/conspects", tags=["content"])


@router.get("", response_model=list[ConspectOut])
async def list_conspects(
    subject: SubjectEnum = SubjectEnum.math, session: AsyncSession = Depends(get_db)
) -> list[ConspectOut]:
    """Какие большие конспекты загружены (без самих страниц). Открыто всем."""
    rows = await session.execute(
        select(Conspect.number, Conspect.title, Conspect.module_id)
        .where(Conspect.subject == subject)
        .order_by(Conspect.number)
    )
    return [ConspectOut(number=n, title=t, module_id=m) for n, t, m in rows]


@router.get("/{subject}/{number}", response_class=Response)
async def get_conspect(
    subject: SubjectEnum,
    number: int,
    session: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> Response:
    """Страница конспекта целиком (HTML). Оглавление (number 0) — всем, конспекты тем —
    только вошедшим: проверить вход может только бэкенд, токен у нас в localStorage."""
    if number != 0 and current_user is None:
        raise HTTPException(status_code=401, detail="Полный конспект открыт после входа")
    page = await session.scalar(
        select(Conspect.html).where(Conspect.subject == subject, Conspect.number == number)
    )
    if page is None:
        raise HTTPException(status_code=404, detail="Конспект не найден")
    return Response(
        content=page,
        media_type="text/html; charset=utf-8",
        headers={"Cache-Control": "private, no-cache"},
    )
