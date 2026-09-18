"""Smoke-тесты программы по классам. Как и test_content.py, смотрят на dev-БД из .env
и предполагают, что сид уже прогнан (python -m scripts.seed)."""
import pytest


@pytest.mark.asyncio
async def test_physics_curriculum_structure(client):
    response = await client.get("/api/curriculum", params={"subject": "physics"})
    assert response.status_code == 200
    grades = response.json()

    assert [g["grade"] for g in grades] == [9, 10, 11]
    lesson_counts = {g["grade"]: sum(len(m["lessons"]) for m in g["modules"]) for g in grades}
    assert lesson_counts == {9: 74, 10: 73, 11: 72}

    for grade in grades:
        numbers = [lesson["number"] for module in grade["modules"] for lesson in module["lessons"]]
        assert numbers == list(range(1, len(numbers) + 1)), f"{grade['grade']} класс: нумерация с дырами"


@pytest.mark.asyncio
async def test_curriculum_links_point_to_existing_topics(client):
    grades = (await client.get("/api/curriculum")).json()
    topic_ids = {t["id"] for t in (await client.get("/api/topics")).json()}

    linked = {
        lesson["topic_id"]
        for grade in grades
        for module in grade["modules"]
        for lesson in module["lessons"]
        if lesson["topic_id"]
    }
    assert linked, "ни одна подтема не связана с темой-практикумом"
    assert linked <= topic_ids


@pytest.mark.asyncio
async def test_math_curriculum_empty_for_now(client):
    response = await client.get("/api/curriculum", params={"subject": "math"})
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_lesson_problems_from_problem_book(client):
    grades = (await client.get("/api/curriculum")).json()
    counts = [lesson["problem_count"] for g in grades for m in g["modules"] for lesson in m["lessons"]]
    assert sum(counts) == 146   # весь сборник Савченко — Балдина разложен по подтемам

    response = await client.get("/api/curriculum/lessons/physics-9-06/problems")
    assert response.status_code == 200
    body = response.json()
    assert len(body["problems"]) == 13
    assert {s["license"] for s in body["sources"]} == {"GNU FDL"}   # авторство и лицензия обязательны


@pytest.mark.asyncio
async def test_lesson_problem_assets_exist(client):
    from pathlib import Path

    public = Path(__file__).resolve().parents[2] / "public"
    body = (await client.get("/api/curriculum/lessons/physics-9-06/problems")).json()
    paths = [p[k] for p in body["problems"] for k in ("figure", "answer_image") if p[k]]
    assert paths
    assert all((public / p).exists() for p in paths)


@pytest.mark.asyncio
async def test_lesson_problems_unknown_lesson(client):
    response = await client.get("/api/curriculum/lessons/nope/problems")
    assert response.status_code == 404
