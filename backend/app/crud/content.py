import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud import progress as progress_crud
from app.models.content import (
    CurriculumLesson,
    CurriculumLessonPoint,
    CurriculumModule,
    LessonProblem,
    Plan,
    ProblemSource,
    Section,
    Task,
    Topic,
    TopicOlympiad,
)
from app.models.enums import LevelEnum, SubjectEnum
from app.models.user import User
from app.schemas.common import TopicProgressOut
from app.schemas.content import (
    CurriculumLessonOut,
    CurriculumModuleOut,
    LessonProblemOut,
    LessonTheoryOut,
    LessonProblemsOut,
    LessonReferenceOut,
    LiteratureSourceOut,
    OlympiadSummaryOut,
    PlanOut,
    ProblemSourceOut,
    SectionOut,
    TaskOut,
    TheoryOut,
    TopicDetailOut,
    TopicListItemOut,
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

    statuses = await progress_crud.task_statuses(session, user_id, [t.id for t in topic.tasks])
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
                status=None if level_locked else statuses.get(task.id),
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
            for link in sorted(topic.olympiad_links, key=lambda link: link.olympiad.position)
        ],
        progress=progress,
        prev_topic_id=prev_id,
        next_topic_id=next_id,
    )


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


async def list_curriculum(session: AsyncSession, subject: SubjectEnum) -> list[CurriculumModuleOut]:
    stmt = (
        select(CurriculumModule)
        .where(CurriculumModule.subject == subject)
        .options(
            selectinload(CurriculumModule.lessons).selectinload(CurriculumLesson.references),
            selectinload(CurriculumModule.lessons).selectinload(CurriculumLesson.points),
        )
        .order_by(CurriculumModule.position)
    )
    modules = (await session.execute(stmt)).scalars().all()

    counts = dict(
        (
            await session.execute(
                select(LessonProblem.lesson_id, func.count(LessonProblem.id)).group_by(LessonProblem.lesson_id)
            )
        ).all()
    )

    # Задачи каталога по темам: подтема показывает их количество и ведёт на страницу темы.
    task_counts = dict(
        (
            await session.execute(select(Task.topic_id, func.count(Task.id)).group_by(Task.topic_id))
        ).all()
    )

    def grades_of(value: str) -> list[int]:
        return sorted(int(g) for g in value.split(",") if g)

    result: list[CurriculumModuleOut] = []
    for module in modules:
        lessons = [
            CurriculumLessonOut(
                id=lesson.id,
                number=lesson.number,
                title=lesson.title,
                description=lesson.description,
                grades=grades_of(lesson.grades),
                topic_id=lesson.topic_id,
                problem_count=counts.get(lesson.id, 0),
                has_theory=bool(lesson.summary),
                task_count=task_counts.get(lesson.topic_id, 0) if lesson.topic_id else 0,
                references=[
                    LessonReferenceOut(
                        source_id=ref.source_id,
                        locator=ref.locator,
                        problems=ref.problems,
                        page=ref.page,
                        solutions_page=ref.solutions_page,
                    )
                    for ref in lesson.references
                ],
            )
            for lesson in module.lessons
        ]
        result.append(
            CurriculumModuleOut(
                id=module.id,
                title=module.title,
                grades=sorted({g for lesson in lessons for g in lesson.grades}),
                lessons=lessons,
            )
        )
    return result

async def list_literature(session: AsyncSession, subject: SubjectEnum) -> list[LiteratureSourceOut]:
    stmt = (
        select(ProblemSource)
        .where(ProblemSource.subject == subject)
        .order_by(ProblemSource.position, ProblemSource.title)
    )
    sources = (await session.execute(stmt)).scalars().all()
    return [
        LiteratureSourceOut(
            id=s.id,
            kind=s.kind,
            category=s.category,
            title=s.title,
            short_title=s.short_title,
            authors=s.authors,
            year=s.year,
            url=s.url,
            access_note=s.access_note,
            annotation=s.annotation,
            license=s.license,
            license_url=s.license_url,
        )
        for s in sources
    ]


async def get_lesson_problems(
    session: AsyncSession, lesson_id: str, user_id: uuid.UUID | None = None
) -> LessonProblemsOut | None:
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
    statuses = await progress_crud.problem_statuses(session, user_id, [p.id for p in problems])
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
                status=statuses.get(p.id),
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


async def get_lesson_theory(session: AsyncSession, lesson_id: str) -> LessonTheoryOut | None:
    """Конспект подтемы вместе с соседями по теме — чтобы листать не возвращаясь в список."""
    lesson = (
        await session.execute(
            select(CurriculumLesson)
            .where(CurriculumLesson.id == lesson_id)
            .options(selectinload(CurriculumLesson.points), selectinload(CurriculumLesson.module))
        )
    ).scalar_one_or_none()
    if lesson is None:
        return None

    siblings = (
        await session.scalars(
            select(CurriculumLesson.id)
            .where(CurriculumLesson.module_id == lesson.module_id)
            .order_by(CurriculumLesson.number)
        )
    ).all()
    index = siblings.index(lesson.id)

    task_count = await session.scalar(
        select(func.count(Task.id)).where(Task.topic_id == lesson.topic_id)
    ) if lesson.topic_id else 0
    problem_count = await session.scalar(
        select(func.count(LessonProblem.id)).where(LessonProblem.lesson_id == lesson.id)
    )

    return LessonTheoryOut(
        id=lesson.id,
        title=lesson.title,
        description=lesson.description,
        grades=sorted(int(g) for g in lesson.grades.split(",") if g),
        summary=lesson.summary,
        points=[p.text for p in lesson.points],
        figure=lesson.figure,
        module_id=lesson.module.id,
        module_title=lesson.module.title,
        subject=getattr(lesson.module.subject, "value", lesson.module.subject),
        topic_id=lesson.topic_id,
        task_count=task_count or 0,
        problem_count=problem_count or 0,
        prev_id=siblings[index - 1] if index > 0 else None,
        next_id=siblings[index + 1] if index + 1 < len(siblings) else None,
    )
