"""Smoke-тесты программы. Как и test_content.py, смотрят на dev-БД из .env
и предполагают, что сид уже прогнан (python -m scripts.seed).

С 2026-10-21 программа — один список тем без деления на классы: классы подписывают
подтему (grades), а не режут программу на части.
"""
import pytest


@pytest.mark.asyncio
async def test_physics_curriculum_structure(client):
    response = await client.get("/api/curriculum", params={"subject": "physics"})
    assert response.status_code == 200
    topics = response.json()

    assert len(topics) == 14
    lessons = [lesson for topic in topics for lesson in topic["lessons"]]
    # 219 занятий плана по классам склеены в 151 подтему: одна и та же тема в разных
    # классах — одна строка, см. scripts/curriculum_topics.py.
    assert len(lessons) == 151
    assert any(len(lesson["grades"]) > 1 for lesson in lessons), "склейки по классам пропали"
    assert all(set(lesson["grades"]) <= {9, 10, 11} for lesson in lessons)

    for topic in topics:
        numbers = [lesson["number"] for lesson in topic["lessons"]]
        assert numbers == list(range(1, len(numbers) + 1)), f"{topic['title']}: нумерация с дырами"
        # Классы темы — объединение классов её подтем.
        assert set(topic["grades"]) == {g for lesson in topic["lessons"] for g in lesson["grades"]}


@pytest.mark.asyncio
async def test_curriculum_links_point_to_existing_topics(client):
    topics = (await client.get("/api/curriculum")).json()
    topic_ids = {t["id"] for t in (await client.get("/api/topics")).json()}

    linked = {
        lesson["topic_id"]
        for topic in topics
        for lesson in topic["lessons"]
        if lesson["topic_id"]
    }
    assert linked, "ни одна подтема не связана с темой-практикумом"
    assert linked <= topic_ids


@pytest.mark.asyncio
async def test_math_curriculum_with_references(client):
    response = await client.get("/api/curriculum", params={"subject": "math"})
    assert response.status_code == 200
    topics = response.json()

    assert len(topics) == 12
    lessons = [lesson for topic in topics for lesson in topic["lessons"]]
    assert len(lessons) == 103
    assert sum(len(lesson["references"]) for lesson in lessons) == 117
    assert all(lesson["problem_count"] == 0 for lesson in lessons)   # тексты из книг не копируются

    literature = (await client.get("/api/curriculum/literature", params={"subject": "math"})).json()
    source_ids = {s["id"] for s in literature}
    assert {ref["source_id"] for lesson in lessons for ref in lesson["references"]} <= source_ids


@pytest.mark.asyncio
async def test_subjects_do_not_mix(client):
    """Номера занятий у физики и математики свои — ключ раскладки должен включать предмет."""
    physics = (await client.get("/api/curriculum", params={"subject": "physics"})).json()
    math = (await client.get("/api/curriculum", params={"subject": "math"})).json()

    physics_ids = {lesson["id"] for topic in physics for lesson in topic["lessons"]}
    math_ids = {lesson["id"] for topic in math for lesson in topic["lessons"]}
    assert not physics_ids & math_ids
    assert all(i.startswith("physics-") for i in physics_ids)
    assert all(i.startswith("math-") for i in math_ids)


@pytest.mark.asyncio
async def test_lesson_problems_from_problem_book(client):
    topics = (await client.get("/api/curriculum")).json()
    counts = [lesson["problem_count"] for topic in topics for lesson in topic["lessons"]]
    assert sum(counts) == 146   # весь сборник Савченко — Балдина разложен по подтемам

    with_problems = next(
        lesson
        for topic in topics
        for lesson in topic["lessons"]
        if lesson["problem_count"] > 0
    )
    response = await client.get(f"/api/curriculum/lessons/{with_problems['id']}/problems")
    assert response.status_code == 200
    body = response.json()
    assert len(body["problems"]) == with_problems["problem_count"]
    assert {s["license"] for s in body["sources"]} == {"GNU FDL"}   # авторство и лицензия обязательны


@pytest.mark.asyncio
async def test_lesson_problem_assets_exist(client):
    from pathlib import Path

    public = Path(__file__).resolve().parents[2] / "public"
    topics = (await client.get("/api/curriculum")).json()

    paths = []
    for topic in topics:
        for lesson in topic["lessons"]:
            if not lesson["problem_count"]:
                continue
            body = (await client.get(f"/api/curriculum/lessons/{lesson['id']}/problems")).json()
            paths += [p[k] for p in body["problems"] for k in ("figure", "answer_image") if p[k]]

    assert paths
    assert all((public / p).exists() for p in paths)


@pytest.mark.asyncio
async def test_lesson_problems_unknown_lesson(client):
    response = await client.get("/api/curriculum/lessons/nope/problems")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_every_lesson_has_theory(client):
    """Конспект написан к каждой подтеме — это обещание страницы «Темы»."""
    for subject in ("physics", "math"):
        topics = (await client.get("/api/curriculum", params={"subject": subject})).json()
        lessons = [lesson for topic in topics for lesson in topic["lessons"]]
        without = [lesson["id"] for lesson in lessons if not lesson["has_theory"]]
        assert not without, f"{subject}: без конспекта {without[:5]}"


@pytest.mark.asyncio
async def test_theory_page_is_complete(client):
    """У конспекта есть текст, тезисы и известная фронтенду анимация."""
    import io
    import re
    from pathlib import Path

    figures_source = (
        Path(__file__).resolve().parents[2] / "src" / "components" / "TheoryFigure.jsx"
    )
    known = set(re.findall(r"^  ([a-z]+): [A-Za-z]", io.open(figures_source, encoding="utf-8").read(), re.M))

    topics = (await client.get("/api/curriculum")).json()
    for lesson in [lesson for topic in topics for lesson in topic["lessons"]][:12]:
        body = (await client.get(f"/api/curriculum/lessons/{lesson['id']}/theory")).json()
        assert body["summary"]
        assert len(body["points"]) >= 3
        # Неизвестный ключ фигуры не сломает страницу, но покажет пустую заставку.
        assert body["figure"] in known, f"{lesson['id']}: нет анимации {body['figure']}"
