from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import content as content_crud
from app.database import get_db
from app.models.enums import SubjectEnum
from app.schemas.content import CurriculumGradeOut, LessonProblemsOut

router = APIRouter(prefix="/curriculum", tags=["content"])


@router.get("", response_model=list[CurriculumGradeOut])
async def list_curriculum(
    subject: SubjectEnum = SubjectEnum.physics, session: AsyncSession = Depends(get_db)
) -> list[CurriculumGradeOut]:
    """Программа по классам: класс → темы → подтемы. Сейчас заполнена только физика."""
    return await content_crud.list_curriculum(session, subject)


@router.get("/lessons/{lesson_id}/problems", response_model=LessonProblemsOut)
async def lesson_problems(lesson_id: str, session: AsyncSession = Depends(get_db)) -> LessonProblemsOut:
    """Задачи из задачников к подтеме. Открыты всем: тексты под GNU FDL, пейвола нет."""
    result = await content_crud.get_lesson_problems(session, lesson_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Подтема не найдена")
    return result
