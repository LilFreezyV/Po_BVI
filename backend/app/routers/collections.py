import re
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import case, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.collections import CollectionAsset, CollectionBook, CollectionChapter, CollectionTask
from app.security import get_current_user

router = APIRouter(prefix="/collections", tags=["content"], dependencies=[Depends(get_current_user)])
PRIVATE = {"Cache-Control": "private, no-store"}


@router.get("")
async def list_books(response: Response, session: AsyncSession = Depends(get_db)):
    response.headers.update(PRIVATE)
    return list(await session.scalars(select(CollectionBook.metadata_json).order_by(CollectionBook.position)))


@router.get("/search")
async def search_tasks(
    response: Response,
    q: str = Query(min_length=1, max_length=160),
    book: str | None = Query(default=None, max_length=60),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db),
):
    response.headers.update(PRIVATE)
    words = re.sub(r"^(?:задача\s+|зад\.?\s+|№\s*)", "", q.strip(), flags=re.IGNORECASE).split()
    if not words:
        return {"items": [], "has_more": False}
    query = select(CollectionTask)
    if book:
        query = query.where(CollectionTask.book == book)
    for word in words:
        query = query.where(or_(CollectionTask.number.icontains(word, autoescape=True),
                                CollectionTask.statement.icontains(word, autoescape=True)))
    exact = " ".join(words)
    query = query.order_by(
        case((CollectionTask.number == exact, 0), else_=1), CollectionTask.book, CollectionTask.chapter,
        CollectionTask.anchor,
    ).offset(offset).limit(41)
    rows = list(await session.scalars(query))
    return {
        "items": [{"book": r.book, "chapter": r.chapter, "anchor": r.anchor, "number": r.number,
                   "excerpt": r.statement[:220]} for r in rows[:40]],
        "has_more": len(rows) > 40,
    }


@router.get("/assets/{asset_id}")
async def get_asset(asset_id: str, session: AsyncSession = Depends(get_db)):
    asset = await session.get(CollectionAsset, asset_id) if len(asset_id) == 64 else None
    if asset is None:
        raise HTTPException(status_code=404, detail="Файл недоступен")
    return Response(
        asset.data, media_type=asset.mime,
        headers={**PRIVATE, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox",
                 "Content-Disposition": f"attachment; filename*=UTF-8''{quote(asset.name, safe='')}"},
    )


@router.get("/{book}/{number}")
async def get_chapter(book: str, number: int, response: Response, session: AsyncSession = Depends(get_db)):
    chapter = await session.get(CollectionChapter, (book, number))
    if chapter is None:
        raise HTTPException(status_code=404, detail="Глава не найдена")
    response.headers.update(PRIVATE)
    return {"html": chapter.html}
