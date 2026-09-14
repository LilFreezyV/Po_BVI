"""Идемпотентный сидинг контента из scripts/seed_data.py.

Никогда не трогает users/task_attempts. Безопасно перезапускать после правки
опечатки в данных — обновляет существующие строки по PK (session.merge) и
пересобирает дочерние коллекции (theory_points, M2M, plan_features).

Запуск: python -m scripts.seed
"""
import asyncio

from sqlalchemy import delete, func, select

from app.database import async_session_factory
from app.models.content import (
    Olympiad,
    OlympiadSubject,
    Plan,
    PlanFeature,
    Section,
    Task,
    TheoryPoint,
    Topic,
    TopicOlympiad,
    University,
    UniversityOlympiad,
)
from scripts.seed_data import OLYMPIAD_TITLE_TO_ID, OLYMPIADS, PLANS, SECTIONS, TOPICS, UNIVERSITIES


def _assert_data_integrity() -> None:
    assert len(TOPICS) == 25, f"Ожидалось 25 тем, получено {len(TOPICS)}"
    total_tasks = sum(len(t["tasks"][level]) for t in TOPICS for level in ("easy", "medium", "hard"))
    assert total_tasks == 150, f"Ожидалось 150 задач, получено {total_tasks}"
    assert len(OLYMPIADS) == 5, f"Ожидалось 5 олимпиад, получено {len(OLYMPIADS)}"
    assert len(UNIVERSITIES) == 6, f"Ожидалось 6 вузов, получено {len(UNIVERSITIES)}"
    assert len(PLANS) == 2, f"Ожидалось 2 тарифа, получено {len(PLANS)}"


async def seed() -> None:
    _assert_data_integrity()

    async with async_session_factory() as session:
        for row in SECTIONS:
            await session.merge(Section(id=row["id"], subject=row["subject"], title=row["title"], hint=row["hint"]))

        for row in OLYMPIADS:
            await session.merge(
                Olympiad(
                    id=row["id"],
                    title=row["title"],
                    level=row["level"],
                    organizer=row["organizer"],
                    dates=row["dates"],
                    grades=row["grades"],
                    perk=row["perk"],
                    note=row["note"],
                )
            )
        await session.flush()

        for row in OLYMPIADS:
            await session.execute(delete(OlympiadSubject).where(OlympiadSubject.olympiad_id == row["id"]))
            for subject in row["subjects"]:
                session.add(OlympiadSubject(olympiad_id=row["id"], subject=subject))
        await session.flush()

        for row in TOPICS:
            await session.merge(
                Topic(
                    id=row["id"],
                    section_id=row["section_id"],
                    title=row["title"],
                    blurb=row["blurb"],
                    minutes=row["minutes"],
                    free=row["free"],
                    order_index=row["order_index"],
                    theory_summary=row["theory_summary"],
                )
            )
        await session.flush()

        for row in TOPICS:
            topic_id = row["id"]
            await session.execute(delete(TheoryPoint).where(TheoryPoint.topic_id == topic_id))
            for position, text in enumerate(row["theory_points"]):
                session.add(TheoryPoint(topic_id=topic_id, position=position, text=text))

            await session.execute(delete(TopicOlympiad).where(TopicOlympiad.topic_id == topic_id))
            for olympiad_id in row["olympiad_ids"]:
                session.add(TopicOlympiad(topic_id=topic_id, olympiad_id=olympiad_id))

            for level in ("easy", "medium", "hard"):
                for position, (task_id, text, source) in enumerate(row["tasks"][level]):
                    await session.merge(
                        Task(
                            id=task_id,
                            topic_id=topic_id,
                            level=level,
                            position=position,
                            text=text,
                            source=source,
                        )
                    )

        for row in UNIVERSITIES:
            await session.merge(
                University(
                    id=row["id"],
                    short=row["short"],
                    title=row["title"],
                    city=row["city"],
                    programs=row["programs"],
                    confirm=row["confirm"],
                    passing=row["passing"],
                )
            )
        await session.flush()

        for row in UNIVERSITIES:
            await session.execute(delete(UniversityOlympiad).where(UniversityOlympiad.university_id == row["id"]))
            for olympiad_title in row["accepts"]:
                olympiad_id = OLYMPIAD_TITLE_TO_ID[olympiad_title]
                session.add(UniversityOlympiad(university_id=row["id"], olympiad_id=olympiad_id))

        for row in PLANS:
            await session.merge(
                Plan(
                    id=row["id"],
                    title=row["title"],
                    price_display=row["price_display"],
                    period=row["period"],
                    summary=row["summary"],
                    cta=row["cta"],
                    accent=row["accent"],
                )
            )
        await session.flush()

        for row in PLANS:
            await session.execute(delete(PlanFeature).where(PlanFeature.plan_id == row["id"]))
            for position, text in enumerate(row["features"]):
                session.add(PlanFeature(plan_id=row["id"], position=position, text=text))

        await session.commit()

        topics_count = await session.scalar(select(func.count(Topic.id)))
        tasks_count = await session.scalar(select(func.count(Task.id)))
        olympiads_count = await session.scalar(select(func.count(Olympiad.id)))
        universities_count = await session.scalar(select(func.count(University.id)))
        plans_count = await session.scalar(select(func.count(Plan.id)))

        print(
            f"Засеяно: {topics_count} тем, {tasks_count} задач, {olympiads_count} олимпиад, "
            f"{universities_count} вузов, {plans_count} тарифов"
        )


if __name__ == "__main__":
    asyncio.run(seed())
