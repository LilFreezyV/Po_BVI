"""Smoke-тест на цикл: регистрация → попытка решения → агрегация прогресса.
Требует настроенный .env с рабочим DATABASE_URL (см. README)."""
import pytest


@pytest.mark.asyncio
async def test_register_and_attempt_cycle(client, unique_email):
    register_response = await client.post(
        "/api/auth/register",
        json={"email": unique_email, "password": "test-password-123", "name": "Тестовый пользователь"},
    )
    assert register_response.status_code == 201
    token = register_response.json()["token"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_response = await client.get("/api/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == unique_email

    for task_id in ("kin-e1", "kin-e2", "kin-m1", "kin-m2", "kin-h1", "kin-h2"):
        attempt_response = await client.post(
            "/api/progress/attempts", json={"task_id": task_id, "solved": True}, headers=headers
        )
        assert attempt_response.status_code == 201

    last_body = attempt_response.json()
    assert last_body["topic_id"] == "kinematics"
    assert last_body["topic_progress"]["status"] == "done"
    assert last_body["topic_progress"]["solved"] == 6

    overview_response = await client.get("/api/progress/overview", headers=headers)
    assert overview_response.status_code == 200
    assert overview_response.json()["solved_tasks"] == 6

    weak_spots_response = await client.get("/api/progress/weak-spots", headers=headers)
    assert weak_spots_response.status_code == 200
    assert weak_spots_response.json() == []
