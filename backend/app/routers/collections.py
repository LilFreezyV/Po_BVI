import re
from urllib.parse import quote
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import case, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.collections import CollectionAsset, CollectionBook, CollectionChapter, CollectionTask, collection_subject
from app.security import get_current_user

router = APIRouter(prefix="/collections", tags=["content"], dependencies=[Depends(get_current_user)])
PRIVATE = {"Cache-Control": "private, no-store"}


@router.get("")
async def list_books(
    response: Response, subject: Literal["physics", "math"] = "physics", session: AsyncSession = Depends(get_db),
):
    response.headers.update(PRIVATE)
    query = select(CollectionBook.metadata_json).where(collection_subject() == subject).order_by(CollectionBook.position)
    return list(await session.scalars(query))


@router.get("/search")
async def search_tasks(
    response: Response,
    q: str = Query(min_length=1, max_length=160),
    book: str | None = Query(default=None, max_length=60),
    offset: int = Query(default=0, ge=0),
    subject: Literal["physics", "math"] = "physics",
    session: AsyncSession = Depends(get_db),
):
    response.headers.update(PRIVATE)
    words = re.sub(r"^(?:задача\s+|зад\.?\s+|№\s*)", "", q.strip(), flags=re.IGNORECASE).split()
    if not words:
        return {"items": [], "has_more": False}
    query = (select(CollectionTask)
             .join(CollectionBook, CollectionBook.slug == CollectionTask.book)
             .where(collection_subject() == subject))
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
                   "excerpt": snippet(r.statement, words) if subject == "math" else r.statement[:220]}
                  for r in rows[:40]],
        "has_more": len(rows) > 40,
    }


def snippet(text, words):
    # В математических книгах строка индекса — целая страница. Показываем место совпадения.
    match = re.search(re.escape(words[0]), text, re.IGNORECASE)
    start = max(0, match.start() - 55) if match else 0
    return ("…" if start else "") + text[start:start + (219 if start else 220)]


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
