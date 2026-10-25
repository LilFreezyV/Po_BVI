"""Даты сезона олимпиад: подписи по-русски, календарь «Ближайшие даты», что пора уточнить.

Работает с этапами из таблицы olympiad_stages (модель OlympiadStage) — или с любым объектом
с теми же полями. Чистые функции без БД: их используют и API навигатора, и бот проверки дат.
"""
from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, time, timedelta, timezone
from typing import Protocol

MSK = timezone(timedelta(hours=3))

MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа",
              "сентября", "октября", "ноября", "декабря"]
MONTHS_NOM = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август",
              "сентябрь", "октябрь", "ноябрь", "декабрь"]
MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
KIND_LABEL = {"registration": "Регистрация", "selection": "Отбор", "final": "Финал"}


class StageLike(Protocol):
    kind: str
    title: str
    starts_on: date | None
    start_precision: str | None
    ends_on: date | None
    end_precision: str | None
    approximate: bool
    time_msk: str | None
    note: str | None


def parse_point(value: str | None, *, end: bool = False) -> tuple[date | None, str | None]:
    """'2026-11-17' → (дата, 'day'); '2027-02' → (1-е или последнее число месяца, 'month')."""
    if value is None:
        return None, None
    parts = [int(p) for p in value.split("-")]
    if len(parts) == 3:
        return date(*parts), "day"
    year, month = parts
    return date(year, month, monthrange(year, month)[1] if end else 1), "month"


def _point(d: date, precision: str, with_year: bool = True, genitive: bool = False) -> str:
    """«17 ноября 2026» или «февраль 2027»; genitive — после «с»/«до»: «с декабря 2026»."""
    if precision == "day":
        text = f"{d.day} {MONTHS_GEN[d.month - 1]}"
    else:
        text = (MONTHS_GEN if genitive else MONTHS_NOM)[d.month - 1]
    return f"{text} {d.year}" if with_year else text


def dates_text(s: StageLike) -> str:
    """Подпись дат этапа: «15–22 октября 2026», «ор. февраль — март 2027», «до 25 декабря 2026»."""
    start, end = s.starts_on, s.ends_on
    if start is None and end is None:
        return ""
    if start is not None and end is None:
        if s.kind == "registration":
            text = f"с {_point(start, s.start_precision, genitive=True)}"
        else:
            text = _point(start, s.start_precision)
    elif start is None:
        text = f"до {_point(end, s.end_precision, genitive=True)}"
    else:
        sp, ep = s.start_precision, s.end_precision
        if sp == ep == "month" and (start.year, start.month) == (end.year, end.month):
            text = _point(start, "month")
        elif sp == ep == "day" and (start.year, start.month) == (end.year, end.month):
            text = f"{start.day}–{end.day} {MONTHS_GEN[end.month - 1]} {end.year}"
        else:
            text = f"{_point(start, sp, with_year=start.year != end.year)} — {_point(end, ep)}"
    exact_day = s.start_precision == "day" or (start is None and s.end_precision == "day")
    if s.time_msk and exact_day:
        text += f", {s.time_msk} МСК"
    return f"ор. {text}" if s.approximate else text


def starts_at(s: StageLike) -> datetime | None:
    """Точный момент начала — для обратного отсчёта. Только для подтверждённых дат до дня."""
    if s.starts_on is None or s.start_precision != "day" or s.approximate:
        return None
    hh, mm = (int(x) for x in (s.time_msk or "00:00").split(":"))
    return datetime.combine(s.starts_on, time(hh, mm), tzinfo=MSK)


def is_unconfirmed(s: StageLike) -> bool:
    """Дата ещё не точная: ориентировочная, известен только месяц или сроков нет вовсе.
    settled — сроки и не станут точнее (например, назначает каждый регион): не напоминаем."""
    if getattr(s, "settled", False):
        return False
    if s.approximate or "month" in (s.start_precision, s.end_precision):
        return True
    return s.starts_on is None and s.ends_on is None and s.kind != "registration"


def due_for_update(s: StageLike, today: date) -> bool:
    """Пора уточнить: дата неточная, а её срок уже наступил (или сроков нет вовсе)."""
    if not is_unconfirmed(s):
        return False
    if s.ends_on is not None and s.ends_on < today:
        return False  # этап уже прошёл — уточнять поздно
    reference = s.starts_on or s.ends_on
    return reference is None or reference <= today


def _short_label(s: StageLike) -> str:
    start, end = s.starts_on, s.ends_on
    if start is None:
        return f"до {end.day} {MONTHS_SHORT[end.month - 1]}"
    one = f"{start.day} {MONTHS_SHORT[start.month - 1]}"
    if end is None or end == start:
        return f"с {one}" if s.kind == "registration" else one
    if (start.year, start.month) == (end.year, end.month):
        return f"{start.day}–{end.day} {MONTHS_SHORT[end.month - 1]}"
    return f"{one} — {end.day} {MONTHS_SHORT[end.month - 1]}"


def calendar_note(s: StageLike) -> str:
    parts = [KIND_LABEL[s.kind] + (f" — {s.title}" if s.title else "")]
    if s.note:
        parts.append(s.note)
    if s.approximate:
        parts.append("дата ориентировочная")
    return " · ".join(parts)


def calendar_items(olympiads, today: date, general: list[dict]) -> list[dict]:
    """Календарь «Ближайшие даты»: этапы с датами до дня (физика или общие), ещё не прошедшие,
    плюс общие даты сезона (правила приёма вузов и т. п.). Сортировка — по дате."""
    items: list[tuple[date, dict]] = []
    for o in olympiads:
        for s in o.stages:
            if s.subject is not None and getattr(s.subject, "value", s.subject) != "physics":
                continue
            day_start = s.starts_on is not None and s.start_precision == "day"
            day_end_only = s.starts_on is None and s.ends_on is not None and s.end_precision == "day"
            if not (day_start or day_end_only):
                continue
            if day_start and s.ends_on is not None and s.end_precision != "day":
                continue
            relevant_until = s.ends_on or s.starts_on
            if relevant_until < today:
                continue
            # Ещё не начавшееся — по дате начала, уже идущее — по сроку окончания:
            # раздел про то, «что закрывается в следующие недели».
            sort_key = s.starts_on if s.starts_on is not None and s.starts_on >= today else relevant_until
            items.append((sort_key, {
                "label": _short_label(s),
                "ends_on": relevant_until,
                "olympiad": o.short_title or o.title,
                "note": calendar_note(s),
            }))
    for g in general:
        ends = date.fromisoformat(g["ends_on"])
        if ends >= today:
            items.append((ends, {**g, "ends_on": ends}))
    items.sort(key=lambda pair: pair[0])
    return [item for _, item in items]
