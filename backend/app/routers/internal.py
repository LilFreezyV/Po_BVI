"""Служебные ручки для расписаний в GitHub Actions. Снаружи выглядят несуществующими (404),
если ключ не задан на сервере или передан неверный."""
import hmac
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app import date_watch
from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/internal", include_in_schema=False)


class DateWatchOut(BaseModel):
    checked: int
    changed: list[str]
    failing: list[str]
    messages: list[str]


def _check_token(token: str | None) -> None:
    expected = settings.date_watch_token
    if not expected or not token or not hmac.compare_digest(token, expected):
        raise HTTPException(status_code=404, detail="Not Found")


@router.post("/date-watch", response_model=DateWatchOut)
async def run_date_watch(
    weekly: bool = False,
    x_watch_token: str | None = Header(default=None),
    session: AsyncSession = Depends(get_db),
) -> DateWatchOut:
    """Проверить страницы с датами олимпиад и вернуть тексты для Telegram (weekly — со сводкой)."""
    _check_token(x_watch_token)
    report = await date_watch.run(session, weekly=weekly, now=datetime.now(timezone.utc))
    return DateWatchOut(
        checked=report.checked, changed=report.changed, failing=report.failing, messages=report.messages
    )
