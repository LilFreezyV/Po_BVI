"""Загрузка больших интерактивных конспектов в базу.

    python -m scripts.load_conspects <папка> [--subject math] [--dry-run]

В папке — файлы вида «00 Оглавление.html», «01 Методы рассуждений.html», …: номер файла
совпадает с номером темы в программе предмета (по порядку тем), 00 — оглавление курса.
Файлы в git не лежат: их копируют на сервер руками (scp) и запускают этот скрипт там
(см. CLAUDE.md). Сид таблицу conspects не трогает, а этот скрипт — ничего, кроме неё.

Перед записью скрипт сверяет каждый конспект с программой: название темы из <title> должно
совпадать с темой в базе, а разделов s1…sN должно быть ровно столько, сколько подтем, — по
ним на сайте строятся ссылки «Полный конспект» из подтемы на её раздел (#s1, #s2, …).
Если что-то из этого не сошлось, ничего не записывается. Названия подтем в «Карте темы»
могут быть сформулированы иначе, чем в программе (при загрузке 2026-10-26 так было у 12
подтем: «Графы: степени и связность» и т.п.) — это только печатается для сверки глазами.
"""

import argparse
import asyncio
import hashlib
import html as html_lib
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import selectinload

from app.database import async_session_factory, engine
from app.models.content import Conspect, CurriculumModule
from app.models.enums import SubjectEnum

FILE_NAME = re.compile(r"^(\d{2}) .+\.html$")
TITLE = re.compile(r"<title>(.*?)</title>", re.S)
SECTION_ID = re.compile(r'<section id="s(\d+)"')
MAP_NAME = re.compile(r'<span class="nm">(.*?)</span>', re.S)
SIBLING_LINK = re.compile(r'href="(\d{2} [^"]+\.html)"')


def _text(fragment: str) -> str:
    return " ".join(html_lib.unescape(re.sub(r"<[^>]+>", "", fragment)).split())


def read_folder(folder: Path) -> dict[int, tuple[Path, str]]:
    files: dict[int, tuple[Path, str]] = {}
    for path in sorted(folder.glob("*.html")):
        match = FILE_NAME.match(path.name)
        if not match:
            continue
        number = int(match.group(1))
        if number in files:
            raise SystemExit(f"Два файла с номером {number:02d}: {files[number][0].name} и {path.name}")
        files[number] = (path, path.read_text(encoding="utf-8"))
    return files


def check(
    files: dict[int, tuple[Path, str]], modules: list[CurriculumModule]
) -> tuple[list[str], list[str]]:
    """Сверка с программой: (ошибки — загрузка невозможна, расхождения названий подтем)."""
    errors: list[str] = []
    renamed: list[str] = []
    names = {path.name for path, _ in files.values()}
    for number, (path, page) in sorted(files.items()):
        if not TITLE.search(page):
            errors.append(f"{path.name}: нет <title>")
            continue
        for link in sorted(set(SIBLING_LINK.findall(page))):
            if link not in names:
                errors.append(f"{path.name}: ссылка на «{link}», а такого файла в папке нет")
        if number == 0:
            continue
        if number > len(modules):
            errors.append(f"{path.name}: в программе только {len(modules)} тем")
            continue
        module = modules[number - 1]
        title = _text(TITLE.search(page).group(1))
        if title != module.title:
            errors.append(f"{path.name}: тема «{title}», а в программе {number}-я тема — «{module.title}»")
        sections = sorted({int(n) for n in SECTION_ID.findall(page)})
        expected = list(range(1, len(module.lessons) + 1))
        if sections != expected:
            errors.append(
                f"{path.name}: разделы s{sections[0] if sections else '?'}…s{sections[-1] if sections else '?'}"
                f" ({len(sections)}), а подтем в теме {len(module.lessons)}"
            )
        map_names = [_text(n) for n in MAP_NAME.findall(page)]
        lesson_titles = [lesson.title for lesson in module.lessons]
        if map_names != lesson_titles:
            for i, (got, want) in enumerate(zip(map_names, lesson_titles), start=1):
                if got != want:
                    renamed.append(f"{path.name}: подтема {i} — «{got}», в программе — «{want}»")
            if len(map_names) != len(lesson_titles):
                errors.append(f"{path.name}: в карте темы {len(map_names)} подтем, в программе {len(lesson_titles)}")
    if 0 not in files:
        errors.append("нет оглавления (файла «00 ….html»)")
    return errors, renamed


async def load(folder: Path, subject: SubjectEnum, dry_run: bool) -> None:
    files = read_folder(folder)
    if not files:
        raise SystemExit(f"В папке {folder} нет файлов вида «01 Название.html»")

    async with async_session_factory() as session:
        modules = (
            await session.scalars(
                select(CurriculumModule)
                .where(CurriculumModule.subject == subject)
                .order_by(CurriculumModule.position)
                .options(selectinload(CurriculumModule.lessons))
            )
        ).all()
        for module in modules:
            module.lessons.sort(key=lambda lesson: lesson.number)

        errors, renamed = check(files, modules)
        if renamed:
            print("Подтемы названы иначе, чем в программе (порядок тот же — проверьте глазами):")
            for line in renamed:
                print(f"  · {line}")
        if errors:
            print("Конспекты не загружены — не сходится с программой в базе:", file=sys.stderr)
            for error in errors:
                print(f"  · {error}", file=sys.stderr)
            raise SystemExit(1)

        now = datetime.now(timezone.utc)
        known = dict(
            (
                await session.execute(
                    select(Conspect.number, Conspect.sha256).where(Conspect.subject == subject)
                )
            ).all()
        )
        total = 0
        for number, (path, page) in sorted(files.items()):
            size = len(page.encode("utf-8"))
            total += size
            digest = hashlib.sha256(page.encode("utf-8")).hexdigest()
            state = "без изменений" if known.get(number) == digest else ("обновлён" if number in known else "новый")
            print(f"  {number:02d} {_text(TITLE.search(page).group(1))} — {size // 1024} КБ, {state}", flush=True)
            if dry_run or known.get(number) == digest:
                continue
            values = dict(
                id=f"{subject.value}-{number:02d}",
                subject=subject,
                number=number,
                module_id=modules[number - 1].id if number else None,
                title=_text(TITLE.search(page).group(1)),
                filename=path.name,
                html=page,
                sha256=digest,
                uploaded_at=now,
            )
            statement = insert(Conspect).values(**values)
            await session.execute(
                statement.on_conflict_do_update(
                    index_elements=[Conspect.id],
                    set_={k: statement.excluded[k] for k in values if k != "id"},
                )
            )
            # По файлу на транзакцию: соединение с Neon на 10 МБ одной транзакцией рвалось.
            # Оборвалось — запустите ещё раз, уже загруженные файлы пропустятся по sha256.
            await session.commit()

        stale = (
            await session.scalars(
                select(Conspect.filename).where(
                    Conspect.subject == subject, Conspect.number.not_in(list(files))
                )
            )
        ).all()
        for name in stale:
            print(f"  ! в базе есть «{name}», а в папке его нет — оставлен как был")

        if dry_run:
            print(f"Проверка прошла, {len(files)} файлов ({total // 1024} КБ). --dry-run: ничего не записано.")
        else:
            print(f"Готово: {len(files)} файлов ({total // 1024} КБ).")


def main() -> None:
    parser = argparse.ArgumentParser(description="Загрузить большие конспекты в базу")
    parser.add_argument("folder", type=Path)
    parser.add_argument("--subject", default="math", choices=[s.value for s in SubjectEnum])
    parser.add_argument("--dry-run", action="store_true", help="только проверить, ничего не записывать")
    args = parser.parse_args()
    if not args.folder.is_dir():
        raise SystemExit(f"Нет такой папки: {args.folder}")
    asyncio.run(_run(args.folder, SubjectEnum(args.subject), args.dry_run))


async def _run(folder: Path, subject: SubjectEnum, dry_run: bool) -> None:
    try:
        await load(folder, subject, dry_run)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    main()
