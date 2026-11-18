"""Load a trusted snapshot for one subject into PostgreSQL after migration 0014."""

import argparse
import asyncio
import json
from pathlib import Path
import re
from zipfile import ZipFile

from sqlalchemy import delete, insert
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.database import async_session_factory, engine
from app.models.collections import CollectionAsset, CollectionBook, CollectionChapter, CollectionTask, collection_subject


async def write_assets(session, rows):
    statement = pg_insert(CollectionAsset)
    await session.execute(statement.on_conflict_do_update(
        index_elements=["id"],
        set_={key: getattr(statement.excluded, key) for key in ("name", "mime", "data")},
    ), rows)


async def load(path, allow_missing):
    try:
        with ZipFile(path) as archive:
            snapshot = json.loads(archive.read("manifest.json"))
            if snapshot.get("version") != 1:
                raise ValueError("Неизвестная версия архива")
            failures = snapshot["failures"]
            if failures and not allow_missing:
                raise ValueError(f"В архиве {len(failures)} недоступных файлов. См. --allow-missing.")
            books, chapters = snapshot["books"], snapshot["chapters"]
            subject = snapshot.get("subject", "physics")
            tasks = [
                {"book": chapter["book"], "chapter": chapter["number"], **task,
                 "number": re.sub(r"^(?:задача|зад\.?|№)\s*", "", task["number"], flags=re.IGNORECASE)}
                for chapter in chapters for task in chapter["tasks"]
            ]
            if subject == "physics" and (len(books), len(chapters), len(tasks)) != (7, 45, 2489):
                raise ValueError("Импорт остановлен: ожидалось 7 сборников, 45 глав и 2489 задач")
            if subject not in {"physics", "math"} or not books or not chapters:
                raise ValueError("Импорт остановлен: неизвестный предмет или пустой архив")
            if subject == "math" and (any(not chapter["html"].strip() for chapter in chapters)
                                      or any("pdf" in entry for book in books for entry in book["chapters"])):
                raise ValueError("Для импорта математики нужен готовый HTML-архив math-web.zip")
            for book in books:
                if book["slug"].startswith("math-") != (subject == "math"):
                    raise ValueError(f"Код сборника не соответствует предмету: {book['slug']}")
                book["subject"] = subject
            async with async_session_factory.begin() as session:
                # Каскад удаляет главы и индекс только выбранного предмета.
                await session.execute(delete(CollectionBook).where(collection_subject() == subject))
                await session.execute(insert(CollectionBook), [
                    {"slug": book["slug"], "position": pos, "metadata_json": book}
                    for pos, book in enumerate(books)
                ])
                await session.execute(insert(CollectionChapter), [
                    {key: chapter[key] for key in ("book", "number", "html")} for chapter in chapters
                ])
                await session.execute(insert(CollectionTask), tasks)
                assets = []
                for asset_id, meta in snapshot["assets"].items():
                    if asset_id in failures:
                        continue
                    assets.append({"id": asset_id, "name": meta["name"], "mime": meta["mime"],
                                   "data": archive.read(f"assets/{asset_id}")})
                    if len(assets) == 64:
                        await write_assets(session, assets)
                        assets.clear()
                if assets:
                    await write_assets(session, assets)
            print(f"Импортировано: {len(books)} сборников, {len(chapters)} глав, {len(tasks)} задач. "
                  f"Файлов недоступно: {len(failures)}.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--allow-missing", action="store_true", help="загрузить архив с недоступными файлами")
    args = parser.parse_args()
    asyncio.run(load(args.snapshot, args.allow_missing))
