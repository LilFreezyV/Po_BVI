"""Тесты БВИ-навигатора: сводная таблица «олимпиада × вуз» и даты сезона.

Как и остальные тесты, работают с реальной dev-БД — после правки scripts/bvi_data.py
нужен `python -m scripts.seed`, иначе числа разъедутся.
"""
import pytest

from app.bvi_meta import LEGEND
from scripts.bvi_data import OLYMPIADS, UNIVERSITIES

CODES = {item["code"] for item in LEGEND}


@pytest.mark.asyncio
async def test_bvi_matrix_is_complete(client):
    response = await client.get("/api/bvi")
    assert response.status_code == 200
    body = response.json()

    assert len(body["universities"]) == len(UNIVERSITIES)
    assert len(body["olympiads"]) == len(OLYMPIADS)

    university_ids = {u["id"] for u in body["universities"]}
    for olympiad in body["olympiads"]:
        # У каждой олимпиады должна быть ячейка по каждому вузу-столбцу, иначе таблица «рваная».
        assert {b["university_id"] for b in olympiad["benefits"]} == university_ids
        for benefit in olympiad["benefits"]:
            assert benefit["winner"] in CODES
            assert benefit["prize"] in CODES


@pytest.mark.asyncio
async def test_bvi_levels_and_links(client):
    response = await client.get("/api/bvi")
    olympiads = response.json()["olympiads"]

    assert all(o["level"] in {"I", "II", "III", "off", "vsosh"} for o in olympiads)
    # Вне перечня — отдельная категория: такие дипломы льгот не дают, но мы их показываем.
    assert any(o["level"] == "off" for o in olympiads)
    # ВсОШ — своя метка, не «вне перечня»: льготы у неё по отдельной статье закона.
    assert [o["id"] for o in olympiads if o["level"] == "vsosh"] == ["vsosh"]
    assert all(o["site_url"] for o in olympiads)


@pytest.mark.asyncio
async def test_old_olympiad_api_is_gone_and_data_moved(client):
    """С 0011 олимпиады и вузы живут только в навигаторе."""
    assert (await client.get("/api/olympiads")).status_code == 404
    assert (await client.get("/api/universities")).status_code == 404

    olympiads = {o["id"]: o for o in (await client.get("/api/bvi")).json()["olympiads"]}
    # Даты туров для обратного отсчёта на главной — у «Физтеха» навигатора.
    assert {s["subject"] for s in olympiads["fizteh"]["stages"]} == {"physics", "math"}

    # «Где встречается» на странице темы — олимпиады навигатора.
    topic = (await client.get("/api/topics/kinematics")).json()
    assert topic["olympiads"]
    assert {o["id"] for o in topic["olympiads"]} <= set(olympiads)


@pytest.mark.asyncio
async def test_bvi_dates_are_not_in_the_past(client):
    response = await client.get("/api/bvi")
    body = response.json()
    updated_on = body["updated_on"]

    # Прошедшее фильтрует бэкенд — иначе список превращается в архив.
    assert all(d["ends_on"] is None or d["ends_on"] >= updated_on for d in body["dates"])
