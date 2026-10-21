from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import content as content_crud
from app.database import get_db
from app.models.enums import SubjectEnum
from app.models.user import User
from app.security import get_current_user_optional
from app.schemas.content import CurriculumModuleOut, LessonProblemsOut, LiteratureSourceOut

router = APIRouter(prefix="/curriculum", tags=["content"])


@router.get("", response_model=list[CurriculumModuleOut])
async def list_curriculum(
    subject: SubjectEnum = SubjectEnum.physics, session: AsyncSession = Depends(get_db)
) -> list[CurriculumModuleOut]:
    """Программа одним списком: крупные темы в порядке прохождения → подтемы.
    Классы не делят программу, а подписывают подтему (grades)."""
    return await content_crud.list_curriculum(session, subject)


@router.get("/literature", response_model=list[LiteratureSourceOut])
async def list_literature(
    subject: SubjectEnum = SubjectEnum.physics, session: AsyncSession = Depends(get_db)
) -> list[LiteratureSourceOut]:
    """Список литературы по предмету: книги и сайты, на которые ссылаются подтемы программы."""
    return await content_crud.list_literature(session, subject)


@router.get("/lessons/{lesson_id}/problems", response_model=LessonProblemsOut)
async def lesson_problems(
    lesson_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> LessonProblemsOut:
    """Задачи из задачников к подтеме. Открыты всем: тексты под GNU FDL, пейвола нет.
    Для вошедшего пользователя — с его отметками (status)."""
    user_id = current_user.id if current_user else None
    result = await content_crud.get_lesson_problems(session, lesson_id, user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Подтема не найдена")
    return result
