"""Идемпотентный сидинг контента из scripts/seed_data.py.

Никогда не трогает users/task_attempts. Безопасно перезапускать после правки
опечатки в данных — обновляет существующие строки по PK (session.merge) и
пересобирает дочерние коллекции (theory_points, M2M, plan_features).

Запуск: python -m scripts.seed
"""
import asyncio
from pathlib import Path

from sqlalchemy import delete, func, select

from app.database import async_session_factory
from app.models.content import (
    CurriculumLesson,
    CurriculumModule,
    LessonProblem,
    Olympiad,
    OlympiadSubject,
    Plan,
    PlanFeature,
    ProblemSource,
    Section,
    Task,
    TheoryPoint,
    Topic,
    TopicOlympiad,
    University,
    UniversityOlympiad,
)
from scripts.curriculum_data import CURRICULUM, iter_modules, lesson_id, module_id
from scripts import problems_savchenko_baldin as savchenko_baldin
from scripts.seed_data import OLYMPIAD_TITLE_TO_ID, OLYMPIADS, PLANS, SECTIONS, TOPICS, UNIVERSITIES


# Задачники: модуль с SOURCE и PROBLEMS. Картинки лежат во фронтенде: public/problems/<id>/{fig,ans}/<номер>.png
PROBLEM_BOOKS = [savchenko_baldin]
PUBLIC_DIR = Path(__file__).resolve().parents[2] / "public"


def _asset(source_id: str, kind: str, number: str) -> str | None:
    rel = f"problems/{source_id}/{kind}/{number}.png"
    return rel if (PUBLIC_DIR / rel).exists() else None


def _assert_data_integrity() -> None:
    assert len(TOPICS) == 25, f"Ожидалось 25 тем, получено {len(TOPICS)}"
    total_tasks = sum(len(t["tasks"][level]) for t in TOPICS for level in ("easy", "medium", "hard"))
    assert total_tasks == 150, f"Ожидалось 150 задач, получено {total_tasks}"
    assert len(OLYMPIADS) == 5, f"Ожидалось 5 олимпиад, получено {len(OLYMPIADS)}"
    assert len(UNIVERSITIES) == 6, f"Ожидалось 6 вузов, получено {len(UNIVERSITIES)}"
    assert len(PLANS) == 2, f"Ожидалось 2 тарифа, получено {len(PLANS)}"

    topic_ids = {t["id"] for t in TOPICS}
    for course in CURRICULUM:
        numbers = [lesson[0] for module in course["modules"] for lesson in module["lessons"]]
        assert numbers == list(range(1, len(numbers) + 1)), (
            f"{course['grade']} класс: номера подтем должны идти подряд с 1"
        )
        for module in course["modules"]:
            for number, _title, _description, topic_id in module["lessons"]:
                assert topic_id is None or topic_id in topic_ids, (
                    f"{course['grade']} класс, подтема {number}: нет темы {topic_id!r}"
                )

    lessons = {(c["grade"], l[0]) for c in CURRICULUM for m in c["modules"] for l in m["lessons"]}
    for book in PROBLEM_BOOKS:
        numbers = [n for n, _, _ in book.PROBLEMS]
        assert len(numbers) == len(set(numbers)), f"{book.SOURCE['id']}: повторяются номера задач"
        for number, ref, text in book.PROBLEMS:
            assert ref in lessons, f"{book.SOURCE['id']} {number}: нет подтемы {ref}"
            if "рисун" in text and "покажите" not in text.lower():
                assert _asset(book.SOURCE["id"], "fig", number), f"{book.SOURCE['id']} {number}: нет файла рисунка"


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

        # Программа по классам. Строк-зависимостей у неё нет, поэтому проще всего
        # пересобрать целиком: удалить модули предметов из данных (уроки уйдут каскадом)
        # и вставить заново — так корректно отрабатывают и переименования, и удаления.
        subjects = {course["subject"] for course in CURRICULUM}
        await session.execute(delete(CurriculumModule).where(CurriculumModule.subject.in_(subjects)))
        await session.flush()
        for subject, grade, position, module in iter_modules():
            mid = module_id(subject, grade, module["slug"])
            session.add(
                CurriculumModule(id=mid, subject=subject, grade=grade, position=position, title=module["title"])
            )
            for number, title, description, topic_id in module["lessons"]:
                session.add(
                    CurriculumLesson(
                        id=lesson_id(subject, grade, number),
                        module_id=mid,
                        number=number,
                        title=title,
                        description=description,
                        topic_id=topic_id,
                    )
                )

        # Задачи из задачников к подтемам. Строки lesson_problems удалились каскадом вместе с
        # подтемами выше — вставляем заново.
        await session.flush()
        for book in PROBLEM_BOOKS:
            src = book.SOURCE
            await session.merge(
                ProblemSource(
                    id=src["id"],
                    title=src["title"],
                    authors=src["authors"],
                    year=src.get("year"),
                    license=src.get("license"),
                    license_url=src.get("license_url"),
                )
            )
            await session.flush()
            await session.execute(delete(LessonProblem).where(LessonProblem.source_id == src["id"]))
            per_lesson: dict[str, int] = {}
            for number, (grade, lesson_number), text in book.PROBLEMS:
                lid = lesson_id("physics", grade, lesson_number)
                per_lesson[lid] = per_lesson.get(lid, 0) + 1
                session.add(
                    LessonProblem(
                        id=f"{src['id']}-{number}",
                        lesson_id=lid,
                        source_id=src["id"],
                        number=number,
                        position=per_lesson[lid],
                        text=text,
                        figure=_asset(src["id"], "fig", number),
                        answer_image=_asset(src["id"], "ans", number),
                    )
                )

        await session.commit()

        topics_count = await session.scalar(select(func.count(Topic.id)))
        tasks_count = await session.scalar(select(func.count(Task.id)))
        olympiads_count = await session.scalar(select(func.count(Olympiad.id)))
        universities_count = await session.scalar(select(func.count(University.id)))
        plans_count = await session.scalar(select(func.count(Plan.id)))
        lessons_count = await session.scalar(select(func.count(CurriculumLesson.id)))
        problems_count = await session.scalar(select(func.count(LessonProblem.id)))

        print(
            f"Засеяно: {topics_count} тем, {tasks_count} задач, {olympiads_count} олимпиад, "
            f"{universities_count} вузов, {plans_count} тарифов, {lessons_count} подтем в программе, "
            f"{problems_count} задач к подтемам"
        )


if __name__ == "__main__":
    asyncio.run(seed())
