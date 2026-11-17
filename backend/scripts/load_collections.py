"""Load a trusted physics snapshot into PostgreSQL after migration 0014."""

import argparse
import asyncio
import json
from pathlib import Path
import re
from zipfile import ZipFile

from sqlalchemy import delete, insert

from app.database import async_session_factory, engine
from app.models.collections import CollectionAsset, CollectionBook, CollectionChapter, CollectionTask


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
            tasks = [
                {"book": chapter["book"], "chapter": chapter["number"], **task,
                 "number": re.sub(r"^(?:задача|зад\.?|№)\s*", "", task["number"], flags=re.IGNORECASE)}
                for chapter in chapters for task in chapter["tasks"]
            ]
            if len(books) != 7 or len(chapters) != 45 or len(tasks) != 2489:
                raise ValueError("Импорт остановлен: ожидалось 7 сборников, 45 глав и 2489 задач")
            async with async_session_factory.begin() as session:
                # CASCADE удаляет только главы и поисковый индекс предыдущего импорта.
                await session.execute(delete(CollectionBook))
                await session.execute(delete(CollectionAsset))
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
                        await session.execute(insert(CollectionAsset), assets)
                        assets.clear()
                if assets:
                    await session.execute(insert(CollectionAsset), assets)
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
