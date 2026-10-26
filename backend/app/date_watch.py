"""Наблюдение за датами олимпиад: что поменялось на страницах с расписанием.

Раз в день GitHub Actions вызывает POST /api/internal/date-watch (см. routers/internal.py и
.github/workflows/date-watch.yml). Сервер — с российским IP, сайты олимпиад его не режут —
скачивает страницу с датами каждой олимпиады навигатора (`dates_url`), оставляет только строки,
похожие на даты и этапы, и сравнивает со снимком в date_watch_snapshots. Ответ — готовые тексты
для Telegram: в сеть Telegram сервер выйти не может (её режет хостер), отправляет GitHub.

На сайт ничего само не пишется: человек смотрит изменение, правит scripts/bvi_data.py и сеет.
"""
from __future__ import annotations

import asyncio
import difflib
import hashlib
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from urllib.parse import urlsplit
from datetime import date, datetime
from html.parser import HTMLParser

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import olympiad_dates
from app.crud.bvi import load_olympiads
from app.models.content import DateWatchSnapshot

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0 Safari/537.36"
)
TIMEOUT = 20.0
MESSAGE_LIMIT = 3800  # у Telegram предел 4096 символов на сообщение

_MONTH = r"(январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)"
DATE_LINE = re.compile(
    rf"\d{{1,2}}\s*(?:[–—-]\s*\d{{1,2}}\s*)?{_MONTH}"  # «15 октября», «15–22 октября»
    rf"|{_MONTH}\w*\s+20\d\d"                          # «февраль 2027»
    r"|\b\d{1,2}\.\d{1,2}\.(?:20)?\d\d\b"              # «15.10.2026»
    r"|\b(?:тур|этап|регистрац|отбор|финал|заключительн)",
    re.IGNORECASE,
)
# Живые счётчики на страницах («осталось 23 дня», «через 5 часов») меняются каждый день сами по
# себе — вырезаем их, иначе бот слал бы ложное «изменение» ежедневно.
COUNTDOWN = re.compile(
    r"\s*\(?\b(?:остал(?:ось|ся|ась)|через)\s+\d+\s+(?:дн\w*|день|час\w*|минут\w*|недел\w*|месяц\w*)\)?",
    re.IGNORECASE,
)


def normalize(line: str) -> str:
    return " ".join(COUNTDOWN.sub("", line).split())


BLOCK_TAGS = {
    "p", "div", "li", "tr", "td", "th", "br", "h1", "h2", "h3", "h4", "h5", "h6",
    "section", "article", "table", "ul", "ol", "dt", "dd", "header", "footer",
}


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript", "svg", "template"}:
            self._skip += 1
        elif tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript", "svg", "template"} and self._skip:
            self._skip -= 1
        elif tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)


def date_lines(html: str) -> list[str]:
    """Строки страницы, похожие на даты и этапы, — в порядке появления, без повторов."""
    parser = _TextExtractor()
    parser.feed(html)
    seen, lines = set(), []
    for raw in "".join(parser.parts).split("\n"):
        line = normalize(raw)
        if not line or len(line) > 400 or not DATE_LINE.search(line):
            continue
        if line not in seen:
            seen.add(line)
            lines.append(line)
    return lines


def decode(response: httpx.Response) -> str:
    """Текст ответа. Если кодировки нет в заголовке, ищем её в <meta charset> (часть сайтов — cp1251)."""
    if "charset=" in response.headers.get("content-type", "").lower():
        return response.text
    head = response.content[:4096].decode("ascii", errors="ignore")
    match = re.search(r"charset=[\"']?([\w-]+)", head, re.IGNORECASE)
    try:
        return response.content.decode(match.group(1) if match else "utf-8", errors="replace")
    except LookupError:
        return response.content.decode("utf-8", errors="replace")


@dataclass
class FetchResult:
    status_code: int | None
    lines: list[str] | None
    error: str | None


async def fetch(url: str) -> FetchResult:
    headers = {"User-Agent": USER_AGENT, "Accept-Language": "ru,en;q=0.8"}
    # У части российских сайтов сертификат от российского УЦ, которого нет в стандартном наборе.
    # Читаем только публичные страницы ради сравнения, поэтому при ошибке TLS повторяем без проверки.
    for verify in (True, False):
        try:
            async with httpx.AsyncClient(
                timeout=TIMEOUT, follow_redirects=True, headers=headers, verify=verify
            ) as client:
                response = await client.get(url)
        except httpx.ConnectError as exc:
            if verify and "CERTIFICATE" in str(exc).upper():
                continue
            return FetchResult(None, None, "не удалось подключиться")
        except httpx.TimeoutException:
            return FetchResult(None, None, f"нет ответа за {int(TIMEOUT)} с")
        except httpx.HTTPError as exc:
            return FetchResult(None, None, type(exc).__name__)
        if response.status_code != 200:
            return FetchResult(response.status_code, None, f"ответ {response.status_code}")
        return FetchResult(200, date_lines(decode(response)), None)
    return FetchResult(None, None, "ошибка сертификата")


@dataclass
class WatchReport:
    checked: int = 0
    changed: list[str] = field(default_factory=list)
    failing: list[str] = field(default_factory=list)
    messages: list[str] = field(default_factory=list)


def _clip(line: str, limit: int = 200) -> str:
    return line if len(line) <= limit else line[: limit - 1] + "…"


def _diff_text(old: str, new: str) -> str:
    old_lines, new_lines = old.split("\n") if old else [], new.split("\n") if new else []
    added = [line for line in new_lines if line not in set(old_lines)]
    removed = [line for line in old_lines if line not in set(new_lines)]
    if not added and not removed:  # строки те же, поменялся только порядок
        added = [d[2:] for d in difflib.ndiff(old_lines, new_lines) if d.startswith("+ ")]
    parts = []
    if added:
        parts.append("Появилось:")
        parts += [f"+ {_clip(line)}" for line in added[:8]]
        if len(added) > 8:
            parts.append(f"… и ещё {len(added) - 8}")
    if removed:
        parts.append("Исчезло:")
        parts += [f"− {_clip(line)}" for line in removed[:5]]
        if len(removed) > 5:
            parts.append(f"… и ещё {len(removed) - 5}")
    return "\n".join(parts)


def _chunks(header: str, blocks: list[str]) -> list[str]:
    """Склеивает блоки в сообщения не длиннее MESSAGE_LIMIT."""
    messages, current = [], header
    for block in blocks:
        if len(current) + len(block) + 2 > MESSAGE_LIMIT and current != header:
            messages.append(current)
            current = header + " (продолжение)"
        current += "\n\n" + block
    if current != header:
        messages.append(current)
    return messages


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _shared_lines(targets, results) -> dict[str, set[str]]:
    """Строки, которые есть сразу на нескольких отслеживаемых страницах одного сайта, — это
    шапка, меню или лента новостей (у каталога olimpiada.ru она одна на все страницы), а не
    даты конкретной олимпиады. Их не сравниваем, иначе одна новость сайта дала бы
    уведомление по каждой олимпиаде с этого сайта."""
    by_host: dict[str, list[set[str]]] = defaultdict(list)
    for (_, url), result in zip(targets, results):
        if result.lines:
            by_host[urlsplit(url).hostname].append(set(result.lines))
    shared = {}
    for host, pages in by_host.items():
        if len(pages) > 1:
            counts = Counter(line for page in pages for line in page)
            shared[host] = {line for line, n in counts.items() if n > 1}
    return shared


def weekly_summary(olympiads, snapshots: dict[str, DateWatchSnapshot], today: date) -> list[str]:
    due = []
    for o in olympiads:
        for s in o.stages:
            if getattr(s.subject, "value", s.subject) == "math":
                continue  # навигатор — про физику
            if olympiad_dates.due_for_update(s, today):
                what = olympiad_dates.KIND_LABEL[s.kind] + (f" «{s.title}»" if s.title else "")
                when = olympiad_dates.dates_text(s) or s.note or "сроков нет"
                due.append(f"• {o.short_title or o.title} — {what}: {when}")
    failing = [
        f"• {o.short_title or o.title} — {snapshots[o.id].error} (с {snapshots[o.id].failing_since:%d.%m})\n"
        f"  {snapshots[o.id].url}"
        for o in olympiads
        if o.id in snapshots and snapshots[o.id].failing_since is not None
    ]
    blind = [
        f"• {o.short_title or o.title} — {snapshots[o.id].url}"
        for o in olympiads
        if o.id in snapshots and snapshots[o.id].status_code == 200 and not snapshots[o.id].excerpt
    ]
    blocks = []
    if due:
        blocks.append("Пора уточнить — срок наступил, а точной даты нет:\n" + "\n".join(due))
    if failing:
        blocks.append("Страницы с датами не открываются:\n" + "\n".join(failing))
    if blind:
        blocks.append(
            "На странице не нашлось ни одной даты — за ней следить бесполезно (сайт рисует её скриптом "
            "или даты на другой странице). Нужна другая ссылка в dates_url:\n" + "\n".join(blind)
        )
    if not blocks:
        blocks.append("Всё спокойно: неточных дат, срок которых наступил, нет, все страницы открываются и читаются.")
    blocks.append("Даты правятся в backend/scripts/bvi_data.py, после — сид на сервере.")
    return _chunks(f"Еженедельная сводка по датам олимпиад ({today:%d.%m.%Y})", blocks)


async def run(session: AsyncSession, *, weekly: bool, now: datetime) -> WatchReport:
    today = now.astimezone(olympiad_dates.MSK).date()
    olympiads = await load_olympiads(session)
    snapshots = {s.olympiad_id: s for s in (await session.scalars(select(DateWatchSnapshot))).all()}

    targets = [(o, o.dates_url or o.site_url) for o in olympiads if (o.dates_url or o.site_url)]
    results = await asyncio.gather(*(fetch(url) for _, url in targets))
    common = _shared_lines(targets, results)

    report = WatchReport(checked=len(targets))
    change_blocks, failure_blocks, recovered, baseline = [], [], [], 0
    for (o, url), result in zip(targets, results):
        name = o.short_title or o.title
        snap = snapshots.get(o.id)
        if snap is None:
            snap = DateWatchSnapshot(olympiad_id=o.id, url=url, checked_at=now)
            session.add(snap)
            snapshots[o.id] = snap
        snap.checked_at = now

        if result.lines is None:  # страница не открылась
            snap.status_code, snap.error = result.status_code, result.error
            if snap.failing_since is None:
                snap.failing_since = now
                failure_blocks.append(f"{name}: страница с датами не открывается — {result.error}\n{url}")
            report.failing.append(o.id)
            continue

        if snap.failing_since is not None and snap.content_hash is not None:
            recovered.append(name)
        snap.status_code, snap.error, snap.failing_since = 200, None, None
        shared = common.get(urlsplit(url).hostname, set())
        excerpt = "\n".join(line for line in result.lines if line not in shared)
        digest = _hash(excerpt)
        # Старый снимок сравниваем по тем же правилам: строка, ставшая общей для сайта
        # (новость в «подвале» каталога), не должна выглядеть изменением.
        old_lines = (normalize(line) for line in (snap.excerpt or "").split("\n"))
        old = "\n".join(line for line in old_lines if line and line not in shared)
        if snap.content_hash is None or snap.url != url:
            baseline += 1  # первый снимок или сменили адрес — сравнивать не с чем
        elif snap.content_hash != digest and _hash(old) != digest:
            report.changed.append(o.id)
            snap.changed_at = now
            change_blocks.append(f"{name}: на странице с датами изменения\n{url}\n{_diff_text(old, excerpt)}")
        snap.url, snap.content_hash, snap.excerpt = url, digest, excerpt

    await session.commit()

    blocks = change_blocks + failure_blocks
    if recovered:
        blocks.append("Снова открываются: " + ", ".join(recovered))
    if baseline:
        blocks.append(f"Сохранены первые снимки для {baseline} страниц — дальше бот сообщит, если на них что-то поменяется.")
    report.messages = _chunks("Даты олимпиад: изменения на сайтах", blocks) if blocks else []
    if weekly:
        report.messages += weekly_summary(olympiads, snapshots, today)
    return report
