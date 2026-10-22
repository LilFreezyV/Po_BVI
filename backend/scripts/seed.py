"""Идемпотентный сидинг контента из scripts/seed_data.py.

Никогда не трогает users/task_attempts. Безопасно перезапускать после правки
опечатки в данных — обновляет существующие строки по PK (session.merge) и
пересобирает дочерние коллекции (theory_points, M2M, plan_features).

Запуск: python -m scripts.seed
"""
import asyncio
from datetime import datetime
from pathlib import Path

from sqlalchemy import delete, func, select

from app.database import async_session_factory
from app.models.content import (
    BviBenefit,
    BviDate,
    BviOlympiad,
    BviUniversity,
    CurriculumLesson,
    CurriculumLessonPoint,
    CurriculumModule,
    LessonProblem,
    LessonReference,
    Olympiad,
    OlympiadStage,
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
from scripts.bvi_data import ARCHIVES as BVI_ARCHIVES
from scripts.bvi_data import DATES as BVI_DATES
from scripts.bvi_data import OLYMPIADS as BVI_OLYMPIADS
from scripts.bvi_data import UNIVERSITIES as BVI_UNIVERSITIES
from scripts.curriculum_data import CURRICULUM
from scripts.curriculum_topics import TOPICS as PHYSICS_TOPICS
from scripts.theory_math import THEORY as THEORY_MATH
from scripts.theory_physics import THEORY as THEORY_PHYSICS
from scripts.curriculum_topics import auto_topics, parse_ref
from scripts import literature_math
from scripts import problems_savchenko_baldin as savchenko_baldin
from scripts.seed_data import (
    OLYMPIAD_STAGES,
    OLYMPIAD_TITLE_TO_ID,
    OLYMPIADS,
    PLANS,
    SECTIONS,
    TOPICS,
    UNIVERSITIES,
)


# Задачники со свободной лицензией: модуль с SOURCE и PROBLEMS, тексты задач копируются.
# Картинки лежат во фронтенде: public/problems/<id>/{fig,ans}/<номер>.png
PROBLEM_BOOKS = [savchenko_baldin]
# Списки литературы: модуль с SOURCES и REFERENCES — только ссылки на главы, без текстов.
LITERATURE = [("math", literature_math)]
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
    for subject in sorted({c["subject"] for c in CURRICULUM}):
        plan_refs = {
            (c["grade"], l[0])
            for c in CURRICULUM
            if c["subject"] == subject
            for m in c["modules"]
            for l in m["lessons"]
        }
        topics = PHYSICS_TOPICS if subject == "physics" else auto_topics(subject, CURRICULUM)
        used = [parse_ref(ref) for t in topics for _, refs in t["lessons"] for ref in refs]
        assert len(used) == len(set(used)), f"{subject}: занятие плана разложено дважды"
        assert set(used) == plan_refs, (
            f"{subject}: не разложены {sorted(plan_refs - set(used))}, "
            f"лишние {sorted(set(used) - plan_refs)}"
        )
    for book in PROBLEM_BOOKS:
        numbers = [n for n, _, _ in book.PROBLEMS]
        assert len(numbers) == len(set(numbers)), f"{book.SOURCE['id']}: повторяются номера задач"
        for number, ref, text in book.PROBLEMS:
            assert ref in lessons, f"{book.SOURCE['id']} {number}: нет подтемы {ref}"
            if "рисун" in text and "покажите" not in text.lower():
                assert _asset(book.SOURCE["id"], "fig", number), f"{book.SOURCE['id']} {number}: нет файла рисунка"

    for subject, lit in LITERATURE:
        subject_lessons = {
            (c["grade"], l[0]) for c in CURRICULUM if c["subject"] == subject for m in c["modules"] for l in m["lessons"]
        }
        source_ids = {s["id"] for s in lit.SOURCES}
        for ref, items in lit.REFERENCES.items():
            assert ref in subject_lessons, f"литература {subject}: нет подтемы {ref}"
            for source_id, *_ in items:
                assert source_id in source_ids, f"литература {subject} {ref}: нет источника {source_id!r}"


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

            await session.execute(delete(OlympiadStage).where(OlympiadStage.olympiad_id == row["id"]))
            for position, (subject, title, starts_at, note) in enumerate(OLYMPIAD_STAGES.get(row["id"], [])):
                session.add(
                    OlympiadStage(
                        id=f"{row['id']}-{subject}-{position}",
                        olympiad_id=row["id"],
                        subject=subject,
                        title=title,
                        starts_at=datetime.fromisoformat(starts_at),
                        note=note,
                    )
                )
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

        # Программа одним списком: крупная тема → подтемы в порядке прохождения, классы —
        # пометкой у подтемы. Раскладка физики ручная (curriculum_topics.TOPICS: одна и та же
        # подтема из разных классов склеена в одну строку), у математики — автоматическая по
        # темам плана. Строк-зависимостей нет, поэтому пересобираем целиком: удаляем темы
        # (подтемы, задачи и ссылки на литературу уйдут каскадом) и вставляем заново.
        plan = {
            (course["subject"], course["grade"], number): (title, description, topic_id)
            for course in CURRICULUM
            for module in course["modules"]
            for number, title, description, topic_id in module["lessons"]
        }
        # (предмет, класс, занятие плана) → id подтемы: по нему привязываются задачи и
        # литература. Предмет в ключе обязателен — номера занятий у физики и математики свои.
        ref_to_lesson: dict[tuple[str, int, int], str] = {}

        THEORY = {"physics": THEORY_PHYSICS, "math": THEORY_MATH}
        subjects = {course["subject"] for course in CURRICULUM}
        await session.execute(delete(CurriculumModule).where(CurriculumModule.subject.in_(subjects)))
        await session.flush()
        for subject in sorted(subjects):
            topics = PHYSICS_TOPICS if subject == "physics" else auto_topics(subject, CURRICULUM)
            for position, topic in enumerate(topics):
                mid = f"{subject}-{topic['slug']}"
                session.add(
                    CurriculumModule(id=mid, subject=subject, position=position, title=topic["title"])
                )
                for number, (title_override, refs) in enumerate(topic["lessons"], start=1):
                    keys = [(subject, *parse_ref(ref)) for ref in refs]
                    first_title, first_description, _ = plan[keys[0]]
                    lid = f"{mid}-{number:02d}"
                    for key in keys:
                        ref_to_lesson[key] = lid
                    # Конспект ищем по первой ссылке на план: ключи в theory_*.py — занятия
                    # плана, а не id подтем, чтобы перенумерация раскладки их не отвязывала.
                    theory = THEORY.get(subject, {}).get(refs[0])
                    session.add(
                        CurriculumLesson(
                            id=lid,
                            module_id=mid,
                            number=number,
                            title=title_override or first_title,
                            description=first_description,
                            grades=",".join(str(g) for g in sorted({g for _, g, _ in keys})),
                            topic_id=next((plan[k][2] for k in keys if plan[k][2]), None),
                            summary=theory["summary"] if theory else None,
                            figure=theory.get("figure") if theory else None,
                        )
                    )
                    if theory:
                        for position, text in enumerate(theory["points"]):
                            session.add(
                                CurriculumLessonPoint(lesson_id=lid, position=position, text=text)
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
                    subject="physics",
                    kind="book",
                    category="Задачники",
                    short_title=src.get("short_title"),
                    position=0,
                )
            )
            await session.flush()
            await session.execute(delete(LessonProblem).where(LessonProblem.source_id == src["id"]))
            per_lesson: dict[str, int] = {}
            for number, (grade, lesson_number), text in book.PROBLEMS:
                lid = ref_to_lesson[("physics", grade, lesson_number)]
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

        # Литература и ссылки подтем на главы книг. Строки lesson_references тоже ушли каскадом
        # вместе с подтемами — вставляем заново.
        for subject, lit in LITERATURE:
            for position, src in enumerate(lit.SOURCES):
                await session.merge(
                    ProblemSource(
                        id=src["id"],
                        subject=subject,
                        kind=src["kind"],
                        category=src["category"],
                        position=position,
                        title=src["title"],
                        short_title=src["short_title"],
                        authors=src["authors"],
                        year=src["year"],
                        url=src["url"],
                        access_note=src["access_note"],
                        annotation=src["annotation"],
                        license=None,
                        license_url=None,
                    )
                )
            await session.flush()
            # Подтема может быть склеена из нескольких занятий плана, поэтому позицию
            # ссылки считаем сквозной по подтеме — иначе id начнут повторяться.
            per_lesson: dict[str, int] = {}
            for (grade, number), items in lit.REFERENCES.items():
                lid = ref_to_lesson[(subject, grade, number)]
                for source_id, locator, problems, page, solutions_page in items:
                    position = per_lesson.get(lid, 0)
                    per_lesson[lid] = position + 1
                    session.add(
                        LessonReference(
                            id=f"{lid}-{position}",
                            lesson_id=lid,
                            source_id=source_id,
                            position=position,
                            locator=locator,
                            problems=problems,
                            page=page,
                            solutions_page=solutions_page,
                        )
                    )

        # ——— БВИ-навигатор ———
        # Пересобираем целиком: строк немного, а льготы вузов меняются каждый сезон,
        # и при merge «по PK» удалённые олимпиады оставались бы в таблице.
        await session.execute(delete(BviBenefit))
        await session.execute(delete(BviDate))
        await session.execute(delete(BviOlympiad))
        await session.execute(delete(BviUniversity))
        await session.flush()

        known_universities = {u["id"] for u in BVI_UNIVERSITIES}
        for position, uni in enumerate(BVI_UNIVERSITIES, start=1):
            session.add(BviUniversity(position=position, **uni))
        assert set(BVI_ARCHIVES) <= {o["id"] for o in BVI_OLYMPIADS}, "архив ссылается на неизвестную олимпиаду"
        for olympiad in BVI_OLYMPIADS:
            data = {k: v for k, v in olympiad.items() if k != "benefits"}
            archive = BVI_ARCHIVES.get(olympiad["id"])
            session.add(
                BviOlympiad(
                    **data,
                    archive_url=archive[0] if archive else None,
                    archive_note=archive[1] if archive else None,
                )
            )
            for university_id, (winner, prize) in olympiad["benefits"].items():
                if university_id not in known_universities:
                    raise AssertionError(
                        f"{olympiad['id']}: неизвестный вуз-столбец {university_id}"
                    )
                session.add(
                    BviBenefit(
                        olympiad_id=olympiad["id"],
                        university_id=university_id,
                        winner=winner,
                        prize=prize,
                    )
                )
        for position, item in enumerate(BVI_DATES, start=1):
            ends = item["ends_on"]
            session.add(
                BviDate(
                    position=position,
                    label=item["label"],
                    ends_on=datetime.strptime(ends, "%Y-%m-%d").date() if ends else None,
                    olympiad=item["olympiad"],
                    note=item["note"],
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
        references_count = await session.scalar(select(func.count(LessonReference.id)))
        theory_count = await session.scalar(
            select(func.count(CurriculumLesson.id)).where(CurriculumLesson.summary.isnot(None))
        )
        bvi_count = await session.scalar(select(func.count(BviOlympiad.id)))
        bvi_cells = await session.scalar(select(func.count()).select_from(BviBenefit))

        print(
            f"Засеяно: {topics_count} тем, {tasks_count} задач, {olympiads_count} олимпиад, "
            f"{universities_count} вузов, {plans_count} тарифов, {lessons_count} подтем в программе, "
            f"{problems_count} задач к подтемам, {references_count} ссылок на литературу, "
            f"{theory_count} конспектов подтем, "
            f"{bvi_count} олимпиад в БВИ-навигаторе ({bvi_cells} ячеек льгот)"
        )


if __name__ == "__main__":
    asyncio.run(seed())
