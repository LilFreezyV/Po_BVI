"""Smoke-тесты для read-only контентных ручек. Требуют настроенный .env с рабочим
DATABASE_URL (используют реальную dev-БД, отдельной тестовой БД в v1 нет — см. README)."""
import pytest


@pytest.mark.asyncio
async def test_subjects(client):
    response = await client.get("/api/subjects")
    assert response.status_code == 200
    assert {item["id"] for item in response.json()} == {"physics", "math"}


@pytest.mark.asyncio
async def test_plans(client):
    response = await client.get("/api/plans")
    assert response.status_code == 200
    assert len(response.json()) == 2


@pytest.mark.asyncio
async def test_topic_list_anonymous(client):
    response = await client.get("/api/topics")
    assert response.status_code == 200
    topics = response.json()
    assert len(topics) == 25
    assert all(t["progress"]["status"] == "new" for t in topics)


@pytest.mark.asyncio
async def test_free_topic_fully_visible_to_anonymous(client):
    response = await client.get("/api/topics/kinematics")
    assert response.status_code == 200
    body = response.json()
    assert body["locked"] is False
    assert all(task["text"] is not None for task in body["tasks"]["hard"])


@pytest.mark.asyncio
async def test_paid_topic_gated_for_anonymous(client):
    response = await client.get("/api/topics/newton")
    assert response.status_code == 200
    body = response.json()
    assert body["locked"] is True
    assert all(task["text"] is None and task["locked"] is True for task in body["tasks"]["hard"])
    assert all(task["text"] is not None for task in body["tasks"]["easy"])
