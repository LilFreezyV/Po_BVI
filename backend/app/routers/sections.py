from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import content as content_crud
from app.database import get_db
from app.models.enums import SubjectEnum
from app.schemas.content import SectionOut

router = APIRouter(prefix="/sections", tags=["content"])


@router.get("", response_model=list[SectionOut])
async def list_sections(
    subject: SubjectEnum | None = None, session: AsyncSession = Depends(get_db)
) -> list[SectionOut]:
    return await content_crud.list_sections(session, subject)
