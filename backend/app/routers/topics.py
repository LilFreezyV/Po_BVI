from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import content as content_crud
from app.database import get_db
from app.models.enums import SubjectEnum
from app.models.user import User
from app.schemas.content import TopicDetailOut, TopicListItemOut
from app.security import get_current_user_optional

router = APIRouter(prefix="/topics", tags=["content"])


@router.get("", response_model=list[TopicListItemOut])
async def list_topics(
    subject: SubjectEnum | None = None,
    q: str | None = None,
    session: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> list[TopicListItemOut]:
    user_id = current_user.id if current_user else None
    return await content_crud.list_topics(session, subject, q, user_id)


@router.get("/{topic_id}", response_model=TopicDetailOut)
async def get_topic(
    topic_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> TopicDetailOut:
    user_id = current_user.id if current_user else None
    detail = await content_crud.get_topic_detail(session, topic_id, user_id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тема не найдена")
    return detail
