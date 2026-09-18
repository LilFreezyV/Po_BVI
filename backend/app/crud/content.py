import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud import progress as progress_crud
from app.models.content import (
    CurriculumLesson,
    CurriculumModule,
    LessonProblem,
    Olympiad,
    Plan,
    Section,
    Topic,
    TopicOlympiad,
    University,
    UniversityOlympiad,
)
from app.models.enums import LevelEnum, SubjectEnum
from app.models.user import User
from app.schemas.common import TopicProgressOut
from app.schemas.content import (
    CurriculumGradeOut,
    CurriculumLessonOut,
    CurriculumModuleOut,
    LessonProblemOut,
    LessonProblemsOut,
    OlympiadOut,
    OlympiadSummaryOut,
    PlanOut,
    ProblemSourceOut,
    SectionOut,
    TaskOut,
    TheoryOut,
    TopicDetailOut,
    TopicListItemOut,
    UniversityOut,
)


async def list_sections(session: AsyncSession, subject: SubjectEnum | None) -> list[SectionOut]:
    stmt = select(Section).order_by(Section.id)
    if subject is not None:
        stmt = stmt.where(Section.subject == subject)
    sections = (await session.execute(stmt)).scalars().all()
    return [SectionOut(id=s.id, subject=s.subject.value, title=s.title, hint=s.hint) for s in sections]


async def list_topics(
    session: AsyncSession, subject: SubjectEnum | None, q: str | None, user_id: uuid.UUID | None
) -> list[TopicListItemOut]:
    stmt = (
        select(Topic)
        .join(Section, Section.id == Topic.section_id)
        .options(selectinload(Topic.olympiad_links))
        .order_by(Topic.order_index)
    )
    if subject is not None:
        stmt = stmt.where(Section.subject == subject)
    if q:
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(or_(func.lower(Topic.title).like(like), func.lower(Topic.blurb).like(like)))

    topics = (await session.execute(stmt)).scalars().all()
    progress_map = await progress_crud.get_topic_progress_map(session, user_id)

    items: list[TopicListItemOut] = []
    for topic in topics:
        progress = progress_map.get(topic.id) or TopicProgressOut(status="new", percent=0, solved=0, total=0)
        items.append(
            TopicListItemOut(
                id=topic.id,
                section_id=topic.section_id,
                title=topic.title,
                blurb=topic.blurb,
                minutes=topic.minutes,
                free=topic.free,
                order_index=topic.order_index,
                olympiad_ids=[link.olympiad_id for link in topic.olympiad_links],
                progress=progress,
            )
        )
    return items


async def get_topic_detail(
    session: AsyncSession, topic_id: str, user_id: uuid.UUID | None
) -> TopicDetailOut | None:
    stmt = (
        select(Topic)
        .where(Topic.id == topic_id)
        .options(
            selectinload(Topic.section),
            selectinload(Topic.theory_points),
            selectinload(Topic.tasks),
            selectinload(Topic.olympiad_links).selectinload(TopicOlympiad.olympiad),
        )
    )
    topic = (await session.execute(stmt)).scalar_one_or_none()
    if topic is None:
        return None

    user = await session.get(User, user_id) if user_id is not None else None
    subscribed = bool(user and user.subscription_active)
    locked = not topic.free and not subscribed

    tasks_by_level: dict[str, list[TaskOut]] = {"easy": [], "medium": [], "hard": []}
    for task in sorted(topic.tasks, key=lambda t: (t.level.value, t.position)):
        level_locked = locked and task.level != LevelEnum.easy
        tasks_by_level[task.level.value].append(
            TaskOut(
                id=task.id,
                level=task.level.value,
                text=None if level_locked else task.text,
                source=None if level_locked else task.source,
                hint=None if level_locked else task.hint,
                solution=None if level_locked else task.solution,
                locked=level_locked,
            )
        )

    prev_id = await session.scalar(select(Topic.id).where(Topic.order_index == topic.order_index - 1))
    next_id = await session.scalar(select(Topic.id).where(Topic.order_index == topic.order_index + 1))

    progress = await progress_crud.get_topic_progress_for_topic(session, user_id, topic_id)

    return TopicDetailOut(
        id=topic.id,
        section_id=topic.section_id,
        section_title=topic.section.title,
        subject=topic.section.subject.value,
        title=topic.title,
        blurb=topic.blurb,
        minutes=topic.minutes,
        free=topic.free,
        locked=locked,
        theory=TheoryOut(
            summary=topic.theory_summary,
            points=[p.text for p in sorted(topic.theory_points, key=lambda p: p.position)],
        ),
        tasks=tasks_by_level,
        olympiads=[
            OlympiadSummaryOut(
                id=link.olympiad.id, title=link.olympiad.title, organizer=link.olympiad.organizer, level=link.olympiad.level
            )
            for link in topic.olympiad_links
        ],
        progress=progress,
        prev_topic_id=prev_id,
        next_topic_id=next_id,
    )


async def list_olympiads(session: AsyncSession) -> list[OlympiadOut]:
    stmt = select(Olympiad).options(selectinload(Olympiad.subject_links)).order_by(Olympiad.id)
    olympiads = (await session.execute(stmt)).scalars().all()
    return [
        OlympiadOut(
            id=o.id,
            title=o.title,
            subjects=[link.subject.value for link in o.subject_links],
            level=o.level,
            organizer=o.organizer,
            dates=o.dates,
            grades=o.grades,
            perk=o.perk,
            note=o.note,
        )
        for o in olympiads
    ]


async def list_universities(session: AsyncSession) -> list[UniversityOut]:
    stmt = (
        select(University)
        .options(selectinload(University.olympiad_links).selectinload(UniversityOlympiad.olympiad))
        .order_by(University.id)
    )
    universities = (await session.execute(stmt)).scalars().all()
    return [
        UniversityOut(
            id=u.id,
            short=u.short,
            title=u.title,
            city=u.city,
            programs=u.programs,
            accepts=[
                OlympiadSummaryOut(
                    id=link.olympiad.id, title=link.olympiad.title, organizer=link.olympiad.organizer, level=link.olympiad.level
                )
                for link in u.olympiad_links
            ],
            confirm=u.confirm,
            passing=u.passing,
        )
        for u in universities
    ]


async def list_plans(session: AsyncSession) -> list[PlanOut]:
    stmt = select(Plan).options(selectinload(Plan.features)).order_by(Plan.id)
    plans = (await session.execute(stmt)).scalars().all()
    return [
        PlanOut(
            id=p.id,
            title=p.title,
            price_display=p.price_display,
            period=p.period,
            summary=p.summary,
            features=[f.text for f in sorted(p.features, key=lambda f: f.position)],
            cta=p.cta,
            accent=p.accent,
        )
        for p in plans
    ]


async def list_curriculum(session: AsyncSession, subject: SubjectEnum) -> list[CurriculumGradeOut]:
    stmt = (
        select(CurriculumModule)
        .where(CurriculumModule.subject == subject)
        .options(selectinload(CurriculumModule.lessons))
        .order_by(CurriculumModule.grade, CurriculumModule.position)
    )
    modules = (await session.execute(stmt)).scalars().all()

    counts = dict(
        (
            await session.execute(
                select(LessonProblem.lesson_id, func.count(LessonProblem.id)).group_by(LessonProblem.lesson_id)
            )
        ).all()
    )

    grades: dict[int, list[CurriculumModuleOut]] = {}
    for module in modules:
        grades.setdefault(module.grade, []).append(
            CurriculumModuleOut(
                id=module.id,
                title=module.title,
                lessons=[
                    CurriculumLessonOut(
                        id=lesson.id,
                        number=lesson.number,
                        title=lesson.title,
                        description=lesson.description,
                        topic_id=lesson.topic_id,
                        problem_count=counts.get(lesson.id, 0),
                    )
                    for lesson in module.lessons
                ],
            )
        )
    return [CurriculumGradeOut(grade=grade, modules=items) for grade, items in grades.items()]


async def get_lesson_problems(session: AsyncSession, lesson_id: str) -> LessonProblemsOut | None:
    if await session.get(CurriculumLesson, lesson_id) is None:
        return None
    stmt = (
        select(LessonProblem)
        .where(LessonProblem.lesson_id == lesson_id)
        .options(selectinload(LessonProblem.source))
        .order_by(LessonProblem.position)
    )
    problems = (await session.execute(stmt)).scalars().all()
    sources = {p.source.id: p.source for p in problems}
    return LessonProblemsOut(
        lesson_id=lesson_id,
        problems=[
            LessonProblemOut(
                id=p.id,
                source_id=p.source_id,
                number=p.number,
                text=p.text,
                figure=p.figure,
                answer_image=p.answer_image,
            )
            for p in problems
        ],
        sources=[
            ProblemSourceOut(
                id=src.id,
                title=src.title,
                authors=src.authors,
                year=src.year,
                license=src.license,
                license_url=src.license_url,
            )
            for src in sources.values()
        ],
    )
