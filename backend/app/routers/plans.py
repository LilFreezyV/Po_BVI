from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import content as content_crud
from app.database import get_db
from app.schemas.content import PlanOut

router = APIRouter(prefix="/plans", tags=["content"])


@router.get("", response_model=list[PlanOut])
async def list_plans(session: AsyncSession = Depends(get_db)) -> list[PlanOut]:
    return await content_crud.list_plans(session)
