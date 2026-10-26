"""Большие конспекты: доступ (оглавление всем, темы — только вошедшим) и сверка файлов с
программой в scripts/load_conspects.py. Сами файлы в git не лежат, поэтому проверки,
которым нужны загруженные конспекты, пропускаются, если в базе их нет."""
from types import SimpleNamespace

import pytest

from scripts.load_conspects import check


@pytest.mark.asyncio
async def test_guest_cannot_open_topic_conspect(client):
    # Вход проверяется раньше, чем ищется конспект, — 401 даже без загруженных файлов.
    response = await client.get("/api/conspects/math/1")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_table_of_contents_is_public(client):
    listing = await client.get("/api/conspects?subject=math")
    assert listing.status_code == 200
    if not any(c["number"] == 0 for c in listing.json()):
        pytest.skip("конспекты не загружены (python -m scripts.load_conspects <папка>)")
    assert all("html" not in c for c in listing.json())

    response = await client.get("/api/conspects/math/0")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "<title>" in response.text


def _module(title, lessons):
    return SimpleNamespace(
        id=f"math-{len(lessons)}", title=title, lessons=[SimpleNamespace(title=t) for t in lessons]
    )


def _page(title, names, sections):
    nav = "".join(f'<a href="#s{i}"><span class="nm">{n}</span></a>' for i, n in enumerate(names, 1))
    body = "".join(f'<section id="s{i}"></section>' for i in range(1, sections + 1))
    return f"<title>{title}</title>{nav}{body}"


def test_check_accepts_renamed_lessons_but_not_structure_errors(tmp_path):
    modules = [_module("Алгебра", ["Квадратный трёхчлен", "Неравенства: сложные задачи"])]
    toc = (tmp_path / "00 Оглавление.html", '<title>Курс</title><a href="01 Алгебра.html">')

    ok = {0: toc, 1: (tmp_path / "01 Алгебра.html", _page("Алгебра", ["Квадратный трёхчлен", "Неравенства: трудные задачи"], 2))}
    errors, renamed = check(ok, modules)
    assert errors == []
    assert len(renamed) == 1 and "трудные" in renamed[0]

    wrong_sections = {0: toc, 1: (tmp_path / "01 Алгебра.html", _page("Алгебра", ["a", "b"], 3))}
    assert check(wrong_sections, modules)[0]

    wrong_title = {0: toc, 1: (tmp_path / "01 Алгебра.html", _page("Геометрия", ["a", "b"], 2))}
    assert check(wrong_title, modules)[0]

    broken_link = {0: toc}
    assert any("01 Алгебра.html" in e for e in check(broken_link, modules)[0])
