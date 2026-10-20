from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import progress as progress_crud
from app.database import get_db
from app.models.user import User
from app.schemas.progress import (
    ContinueItemOut,
    ProblemAttemptIn,
    ProblemAttemptResponseOut,
    ProblemBookProgressOut,
    ProgressOverviewOut,
    QuestionItemOut,
    SubjectSummaryOut,
    TaskAttemptIn,
    TaskAttemptResponseOut,
    TopicProgressItemOut,
    WeakSpotOut,
)
from app.security import get_current_user

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/topics", response_model=list[TopicProgressItemOut])
async def list_topic_progress(
    session: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[TopicProgressItemOut]:
    progress_map = await progress_crud.get_topic_progress_map(session, current_user.id)
    return [
        TopicProgressItemOut(topic_id=topic_id, **progress.model_dump())
        for topic_id, progress in progress_map.items()
    ]


@router.get("/subjects", response_model=list[SubjectSummaryOut])
async def subject_summary(
    session: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[SubjectSummaryOut]:
    return await progress_crud.get_subject_summary(session, current_user.id)


@router.get("/overview", response_model=ProgressOverviewOut)
async def overview(
    session: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> ProgressOverviewOut:
    return await progress_crud.get_overview(session, current_user.id)


@router.get("/continue", response_model=list[ContinueItemOut])
async def continue_list(
    limit: int = 3,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ContinueItemOut]:
    return await progress_crud.get_continue_list(session, current_user.id, limit)


@router.get("/weak-spots", response_model=list[WeakSpotOut])
async def weak_spots(
    limit: int = 3,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WeakSpotOut]:
    return await progress_crud.get_weak_spots(session, current_user.id, limit)


@router.get("/questions", response_model=list[QuestionItemOut])
async def questions(
    session: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[QuestionItemOut]:
    return await progress_crud.list_questions(session, current_user.id)


@router.get("/problem-books", response_model=list[ProblemBookProgressOut])
async def problem_books(
    session: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[ProblemBookProgressOut]:
    return await progress_crud.get_problem_book_progress(session, current_user.id)


@router.post("/attempts", response_model=TaskAttemptResponseOut)
async def set_task_status(
    payload: TaskAttemptIn,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskAttemptResponseOut:
    """Отметка у задачи темы: solved / question; status=null снимает отметку."""
    task = await progress_crud.set_task_status(session, current_user.id, payload.task_id, payload.status)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    topic_progress = await progress_crud.get_topic_progress_for_topic(session, current_user.id, task.topic_id)
    return TaskAttemptResponseOut(
        task_id=task.id, status=payload.status, topic_id=task.topic_id, topic_progress=topic_progress
    )


@router.post("/problem-attempts", response_model=ProblemAttemptResponseOut)
async def set_problem_status(
    payload: ProblemAttemptIn,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProblemAttemptResponseOut:
    """То же для задачи из сборника на странице программы."""
    found = await progress_crud.set_problem_status(session, current_user.id, payload.problem_id, payload.status)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    return ProblemAttemptResponseOut(problem_id=payload.problem_id, status=payload.status)
