from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import content as content_crud
from app.database import get_db
from app.schemas.content import UniversityOut

router = APIRouter(prefix="/universities", tags=["content"])


@router.get("", response_model=list[UniversityOut])
async def list_universities(session: AsyncSession = Depends(get_db)) -> list[UniversityOut]:
    return await content_crud.list_universities(session)
