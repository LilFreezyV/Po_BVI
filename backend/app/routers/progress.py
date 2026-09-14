from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import progress as progress_crud
from app.database import get_db
from app.models.user import User
from app.schemas.progress import (
    ContinueItemOut,
    ProgressOverviewOut,
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


@router.post("/attempts", response_model=TaskAttemptResponseOut, status_code=status.HTTP_201_CREATED)
async def create_attempt(
    payload: TaskAttemptIn,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskAttemptResponseOut:
    task = await progress_crud.record_attempt(session, current_user.id, payload.task_id, payload.solved)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    topic_progress = await progress_crud.get_topic_progress_for_topic(session, current_user.id, task.topic_id)
    return TaskAttemptResponseOut(
        task_id=task.id, solved=payload.solved, topic_id=task.topic_id, topic_progress=topic_progress
    )
