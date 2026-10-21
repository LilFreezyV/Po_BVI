from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import bvi as bvi_crud
from app.database import get_db
from app.schemas.bvi import BviOut

router = APIRouter(prefix="/bvi", tags=["content"])


@router.get("", response_model=BviOut)
async def get_bvi(session: AsyncSession = Depends(get_db)) -> BviOut:
    return await bvi_crud.get_bvi(session)
