from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import content as content_crud
from app.database import get_db
from app.schemas.content import OlympiadOut

router = APIRouter(prefix="/olympiads", tags=["content"])


@router.get("", response_model=list[OlympiadOut])
async def list_olympiads(session: AsyncSession = Depends(get_db)) -> list[OlympiadOut]:
    return await content_crud.list_olympiads(session)
