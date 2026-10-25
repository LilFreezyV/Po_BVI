"""Наблюдение за датами олимпиад: подписи дат, выборка строк со страниц, ручка с ключом.

Сайты олимпиад здесь не скачиваются — проверяются чистые функции и защита ручки.
"""
from datetime import date
from types import SimpleNamespace

import pytest

from app import date_watch, olympiad_dates
from app.config import settings


def _stage(kind="selection", start=None, end=None, **kw):
    starts_on, sp = olympiad_dates.parse_point(start)
    ends_on, ep = olympiad_dates.parse_point(end, end=True)
    defaults = dict(title="", approximate=False, settled=False, time_msk=None, note=None, subject=None)
    return SimpleNamespace(kind=kind, starts_on=starts_on, start_precision=sp, ends_on=ends_on,
                           end_precision=ep, **{**defaults, **kw})


def test_dates_text_variants():
    assert olympiad_dates.dates_text(_stage(start="2026-10-15", end="2026-10-22")) == "15–22 октября 2026"
    assert olympiad_dates.dates_text(_stage(start="2026-11-27", end="2026-12-04")) == "27 ноября — 4 декабря 2026"
    assert olympiad_dates.dates_text(_stage(start="2026-12", end="2027-01")) == "декабрь 2026 — январь 2027"
    assert olympiad_dates.dates_text(_stage(start="2027-02", approximate=True)) == "ор. февраль 2027"
    assert olympiad_dates.dates_text(_stage("registration", start="2026-12", approximate=True)) == "ор. с декабря 2026"
    assert olympiad_dates.dates_text(_stage(end="2026-12-25")) == "до 25 декабря 2026"
    assert (
        olympiad_dates.dates_text(_stage("registration", end="2026-10-24", time_msk="08:00"))
        == "до 24 октября 2026, 08:00 МСК"
    )
    assert olympiad_dates.dates_text(_stage(note="дата уточняется")) == ""


def test_countdown_only_for_confirmed_days():
    assert olympiad_dates.starts_at(_stage(start="2026-10-25", time_msk="08:00")).hour == 8
    assert olympiad_dates.starts_at(_stage(start="2027-02")) is None
    assert olympiad_dates.starts_at(_stage(start="2027-02-28", approximate=True)) is None


def test_due_for_update():
    today = date(2026, 12, 10)
    assert olympiad_dates.due_for_update(_stage(start="2026-12", approximate=True), today)   # месяц наступил
    assert not olympiad_dates.due_for_update(_stage(start="2027-02", approximate=True), today)  # ещё рано
    assert not olympiad_dates.due_for_update(_stage(start="2026-12-05", end="2026-12-07"), today)  # точная
    assert olympiad_dates.due_for_update(_stage("final", note="дата уточняется"), today)  # сроков нет
    assert not olympiad_dates.due_for_update(_stage(start="2026-09", end="2026-10", settled=True), today)


def test_date_lines_keep_only_dates_and_stages():
    html = """<html><head><style>.x{}</style><script>var d='1 января';</script></head><body>
      <h2>Расписание</h2><p>Отборочный этап: 15–22 октября 2026</p>
      <div>Контакты: +7 495 000-00-00</div><p>Заключительный этап — <b>февраль 2027</b></p>
      <p>Отборочный этап: 15–22 октября 2026</p></body></html>"""
    assert date_watch.date_lines(html) == [
        "Отборочный этап: 15–22 октября 2026",
        "Заключительный этап — февраль 2027",
    ]


def test_diff_text_shows_added_and_removed():
    text = date_watch._diff_text("Финал — ор. март\nОтбор — 1 декабря", "Отбор — 1 декабря\nФинал — 14 марта 2027")
    assert "+ Финал — 14 марта 2027" in text and "− Финал — ор. март" in text


@pytest.mark.asyncio
async def test_internal_endpoint_hidden_without_token(client, monkeypatch):
    monkeypatch.setattr(settings, "date_watch_token", None)
    assert (await client.post("/api/internal/date-watch")).status_code == 404

    monkeypatch.setattr(settings, "date_watch_token", "right-token")
    response = await client.post("/api/internal/date-watch", headers={"X-Watch-Token": "wrong"})
    assert response.status_code == 404
