import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import (
    CurriculumLesson,
    CurriculumModule,
    LessonProblem,
    ProblemSource,
    Section,
    Task,
    Topic,
)
from app.models.enums import LevelEnum
from app.models.progress import QUESTION, SOLVED, ProblemAttempt, TaskAttempt
from app.schemas.common import TopicProgressOut
from app.schemas.progress import (
    ContinueItemOut,
    ProblemBookGradeOut,
    ProblemBookModuleOut,
    ProblemBookProgressOut,
    ProgressOverviewOut,
    QuestionItemOut,
    SubjectSummaryOut,
    WeakSpotOut,
)

LEVEL_TITLES = {"easy": "лёгкий", "medium": "средний", "hard": "сложный"}


def _excerpt(text: str, limit: int = 140) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _status_for(solved: int, total: int) -> str:
    if total and solved == total:
        return "done"
    if solved > 0:
        return "progress"
    return "new"


async def get_topic_progress_map(
    session: AsyncSession, user_id: uuid.UUID | None
) -> dict[str, TopicProgressOut]:
    total_stmt = select(Task.topic_id, func.count(Task.id)).group_by(Task.topic_id)
    totals = dict((await session.execute(total_stmt)).all())

    solved_counts: dict[str, int] = {}
    if user_id is not None:
        solved_stmt = (
            select(Task.topic_id, func.count(TaskAttempt.id))
            .join(
                TaskAttempt,
                and_(
                    TaskAttempt.task_id == Task.id,
                    TaskAttempt.user_id == user_id,
                    TaskAttempt.status == SOLVED,
                ),
            )
            .group_by(Task.topic_id)
        )
        solved_counts = dict((await session.execute(solved_stmt)).all())

    result: dict[str, TopicProgressOut] = {}
    for topic_id, total in totals.items():
        solved = solved_counts.get(topic_id, 0)
        percent = round(100 * solved / total) if total else 0
        result[topic_id] = TopicProgressOut(
            status=_status_for(solved, total), percent=percent, solved=solved, total=total
        )
    return result


async def get_topic_progress_for_topic(
    session: AsyncSession, user_id: uuid.UUID | None, topic_id: str
) -> TopicProgressOut:
    total = await session.scalar(select(func.count(Task.id)).where(Task.topic_id == topic_id)) or 0
    solved = 0
    if user_id is not None:
        solved = (
            await session.scalar(
                select(func.count(TaskAttempt.id))
                .join(Task, Task.id == TaskAttempt.task_id)
                .where(
                    Task.topic_id == topic_id,
                    TaskAttempt.user_id == user_id,
                    TaskAttempt.status == SOLVED,
                )
            )
            or 0
        )
    percent = round(100 * solved / total) if total else 0
    return TopicProgressOut(status=_status_for(solved, total), percent=percent, solved=solved, total=total)


async def get_subject_summary(session: AsyncSession, user_id: uuid.UUID | None) -> list[SubjectSummaryOut]:
    progress_map = await get_topic_progress_map(session, user_id)
    rows = (await session.execute(select(Topic.id, Section.subject).join(Section, Section.id == Topic.section_id))).all()

    by_subject: dict[str, list[TopicProgressOut]] = {}
    for topic_id, subject in rows:
        subject_value = subject.value if hasattr(subject, "value") else subject
        progress = progress_map.get(topic_id)
        if progress is not None:
            by_subject.setdefault(subject_value, []).append(progress)

    result: list[SubjectSummaryOut] = []
    for subject_value in ("physics", "math"):
        entries = by_subject.get(subject_value, [])
        total_topics = len(entries)
        done = sum(1 for p in entries if p.status == "done")
        percent = round(sum(p.percent for p in entries) / total_topics) if total_topics else 0
        result.append(SubjectSummaryOut(subject=subject_value, percent=percent, done=done, total=total_topics))
    return result


async def get_overview(session: AsyncSession, user_id: uuid.UUID | None) -> ProgressOverviewOut:
    progress_map = await get_topic_progress_map(session, user_id)
    values = list(progress_map.values())
    return ProgressOverviewOut(
        done=sum(1 for p in values if p.status == "done"),
        progress=sum(1 for p in values if p.status == "progress"),
        new=sum(1 for p in values if p.status == "new"),
        solved_tasks=sum(p.solved for p in values),
        total_tasks=sum(p.total for p in values),
        questions=await count_questions(session, user_id) if user_id is not None else 0,
    )


async def get_continue_list(
    session: AsyncSession, user_id: uuid.UUID, limit: int = 3
) -> list[ContinueItemOut]:
    progress_map = await get_topic_progress_map(session, user_id)
    in_progress_ids = [topic_id for topic_id, p in progress_map.items() if p.status == "progress"]
    if not in_progress_ids:
        return []

    last_attempt_stmt = (
        select(Task.topic_id, func.max(TaskAttempt.updated_at))
        .join(TaskAttempt, TaskAttempt.task_id == Task.id)
        .where(TaskAttempt.user_id == user_id, Task.topic_id.in_(in_progress_ids))
        .group_by(Task.topic_id)
    )
    last_attempts = dict((await session.execute(last_attempt_stmt)).all())

    topics_stmt = (
        select(Topic.id, Topic.title, Section.title)
        .join(Section, Section.id == Topic.section_id)
        .where(Topic.id.in_(in_progress_ids))
    )
    topic_rows = (await session.execute(topics_stmt)).all()

    epoch = datetime.min.replace(tzinfo=timezone.utc)
    ranked = []
    for topic_id, title, section_title in topic_rows:
        progress = progress_map[topic_id]
        last_at = last_attempts.get(topic_id) or epoch
        ranked.append(
            (
                last_at,
                ContinueItemOut(
                    topic_id=topic_id,
                    title=title,
                    section_title=section_title,
                    percent=progress.percent,
                    remaining=progress.total - progress.solved,
                ),
            )
        )
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    return [item for _, item in ranked[:limit]]


async def get_weak_spots(session: AsyncSession, user_id: uuid.UUID, limit: int = 3) -> list[WeakSpotOut]:
    progress_map = await get_topic_progress_map(session, user_id)
    in_progress_ids = [topic_id for topic_id, p in progress_map.items() if p.status == "progress"]
    if not in_progress_ids:
        return []

    hard_unsolved_stmt = (
        select(Task.topic_id)
        .outerjoin(
            TaskAttempt,
            and_(
                TaskAttempt.task_id == Task.id,
                TaskAttempt.user_id == user_id,
                TaskAttempt.status == SOLVED,
            ),
        )
        .where(
            Task.topic_id.in_(in_progress_ids),
            Task.level == LevelEnum.hard,
            TaskAttempt.id.is_(None),
        )
    )
    hard_unsolved_topics = {row[0] for row in (await session.execute(hard_unsolved_stmt)).all()}

    titles_stmt = select(Topic.id, Topic.title).where(Topic.id.in_(in_progress_ids))
    titles = dict((await session.execute(titles_stmt)).all())

    ranked = sorted(
        in_progress_ids,
        key=lambda topic_id: (0 if topic_id in hard_unsolved_topics else 1, progress_map[topic_id].percent),
    )

    result: list[WeakSpotOut] = []
    for topic_id in ranked[:limit]:
        reason = (
            "Сложный уровень не решён"
            if topic_id in hard_unsolved_topics
            else f"Прогресс {progress_map[topic_id].percent}%"
        )
        result.append(WeakSpotOut(topic_id=topic_id, title=titles[topic_id], reason=reason))
    return result


async def set_task_status(
    session: AsyncSession, user_id: uuid.UUID, task_id: str, status: str | None
) -> Task | None:
    """status=None снимает отметку."""
    task = await session.get(Task, task_id)
    if task is None:
        return None
    if status is None:
        await session.execute(
            delete(TaskAttempt).where(TaskAttempt.user_id == user_id, TaskAttempt.task_id == task_id)
        )
    else:
        await session.execute(
            pg_insert(TaskAttempt)
            .values(id=uuid.uuid4(), user_id=user_id, task_id=task_id, status=status)
            .on_conflict_do_update(
                index_elements=[TaskAttempt.user_id, TaskAttempt.task_id],
                set_={"status": status, "updated_at": func.now()},
            )
        )
    await session.commit()
    return task


async def set_problem_status(
    session: AsyncSession, user_id: uuid.UUID, problem_id: str, status: str | None
) -> bool:
    if await session.get(LessonProblem, problem_id) is None:
        return False
    if status is None:
        await session.execute(
            delete(ProblemAttempt).where(ProblemAttempt.user_id == user_id, ProblemAttempt.problem_id == problem_id)
        )
    else:
        await session.execute(
            pg_insert(ProblemAttempt)
            .values(id=uuid.uuid4(), user_id=user_id, problem_id=problem_id, status=status)
            .on_conflict_do_update(
                index_elements=[ProblemAttempt.user_id, ProblemAttempt.problem_id],
                set_={"status": status, "updated_at": func.now()},
            )
        )
    await session.commit()
    return True


async def task_statuses(session: AsyncSession, user_id: uuid.UUID | None, task_ids: list[str]) -> dict[str, str]:
    if user_id is None or not task_ids:
        return {}
    rows = await session.execute(
        select(TaskAttempt.task_id, TaskAttempt.status).where(
            TaskAttempt.user_id == user_id, TaskAttempt.task_id.in_(task_ids)
        )
    )
    return dict(rows.all())


async def problem_statuses(
    session: AsyncSession, user_id: uuid.UUID | None, problem_ids: list[str]
) -> dict[str, str]:
    if user_id is None or not problem_ids:
        return {}
    rows = await session.execute(
        select(ProblemAttempt.problem_id, ProblemAttempt.status).where(
            ProblemAttempt.user_id == user_id, ProblemAttempt.problem_id.in_(problem_ids)
        )
    )
    return dict(rows.all())


async def count_questions(session: AsyncSession, user_id: uuid.UUID) -> int:
    tasks = await session.scalar(
        select(func.count(TaskAttempt.id)).where(TaskAttempt.user_id == user_id, TaskAttempt.status == QUESTION)
    )
    problems = await session.scalar(
        select(func.count(ProblemAttempt.id))
        .join(LessonProblem, LessonProblem.id == ProblemAttempt.problem_id)
        .where(ProblemAttempt.user_id == user_id, ProblemAttempt.status == QUESTION)
    )
    return (tasks or 0) + (problems or 0)


async def list_questions(session: AsyncSession, user_id: uuid.UUID) -> list[QuestionItemOut]:
    """Задачи тем и задачи из сборников с отметкой «есть вопросы», свежие сверху."""
    items: list[tuple[datetime, QuestionItemOut]] = []

    task_rows = await session.execute(
        select(TaskAttempt.updated_at, Task, Topic.title)
        .join(Task, Task.id == TaskAttempt.task_id)
        .join(Topic, Topic.id == Task.topic_id)
        .where(TaskAttempt.user_id == user_id, TaskAttempt.status == QUESTION)
    )
    for updated_at, task, topic_title in task_rows.all():
        items.append(
            (
                updated_at,
                QuestionItemOut(
                    kind="task",
                    id=task.id,
                    title=topic_title,
                    subtitle=f"{LEVEL_TITLES[task.level.value].capitalize()} уровень, задача {task.position + 1}",
                    excerpt=_excerpt(task.text),
                    topic_id=task.topic_id,
                    lesson_id=None,
                ),
            )
        )

    problem_rows = await session.execute(
        select(ProblemAttempt.updated_at, LessonProblem, func.coalesce(ProblemSource.short_title, ProblemSource.title), CurriculumLesson.title)
        .join(LessonProblem, LessonProblem.id == ProblemAttempt.problem_id)
        .join(ProblemSource, ProblemSource.id == LessonProblem.source_id)
        .join(CurriculumLesson, CurriculumLesson.id == LessonProblem.lesson_id)
        .where(ProblemAttempt.user_id == user_id, ProblemAttempt.status == QUESTION)
    )
    for updated_at, problem, source_title, lesson_title in problem_rows.all():
        items.append(
            (
                updated_at,
                QuestionItemOut(
                    kind="problem",
                    id=problem.id,
                    title=f"{source_title}, №{problem.number}",
                    subtitle=lesson_title,
                    excerpt=_excerpt(problem.text),
                    topic_id=None,
                    lesson_id=problem.lesson_id,
                ),
            )
        )

    epoch = datetime.min.replace(tzinfo=timezone.utc)
    items.sort(key=lambda pair: pair[0] or epoch, reverse=True)
    return [item for _, item in items]


def _group_problem_books(rows, statuses: dict[str, str]) -> list[ProblemBookProgressOut]:
    books: dict[str, dict] = {}
    for problem_id, source_id, source_title, subject, grade, module_id, module_title, position in rows:
        book = books.setdefault(
            source_id,
            {"title": source_title, "subject": getattr(subject, "value", subject), "grades": {}},
        )
        grade_entry = book["grades"].setdefault(grade, {})
        module = grade_entry.setdefault(
            module_id, {"title": module_title, "position": position, "total": 0, "solved": 0, "questions": 0}
        )
        module["total"] += 1
        status = statuses.get(problem_id)
        if status == SOLVED:
            module["solved"] += 1
        elif status == QUESTION:
            module["questions"] += 1

    result = []
    for source_id, book in books.items():
        grades = []
        for grade in sorted(book["grades"]):
            modules = [
                ProblemBookModuleOut(
                    module_id=mid, title=m["title"], total=m["total"], solved=m["solved"], questions=m["questions"]
                )
                for mid, m in sorted(book["grades"][grade].items(), key=lambda kv: kv[1]["position"])
            ]
            grades.append(
                ProblemBookGradeOut(
                    grade=grade,
                    total=sum(m.total for m in modules),
                    solved=sum(m.solved for m in modules),
                    questions=sum(m.questions for m in modules),
                    modules=modules,
                )
            )
        result.append(
            ProblemBookProgressOut(
                source_id=source_id,
                title=book["title"],
                subject=book["subject"],
                total=sum(g.total for g in grades),
                solved=sum(g.solved for g in grades),
                questions=sum(g.questions for g in grades),
                grades=grades,
            )
        )
    return result


async def get_problem_book_progress(session: AsyncSession, user_id: uuid.UUID) -> list[ProblemBookProgressOut]:
    """Прогресс по задачам из сборников: сборник → класс → тема программы."""
    rows = (
        await session.execute(
            select(
                LessonProblem.id,
                ProblemSource.id,
                func.coalesce(ProblemSource.short_title, ProblemSource.title),
                CurriculumModule.subject,
                CurriculumModule.grade,
                CurriculumModule.id,
                CurriculumModule.title,
                CurriculumModule.position,
            )
            .join(ProblemSource, ProblemSource.id == LessonProblem.source_id)
            .join(CurriculumLesson, CurriculumLesson.id == LessonProblem.lesson_id)
            .join(CurriculumModule, CurriculumModule.id == CurriculumLesson.module_id)
        )
    ).all()
    statuses = await problem_statuses(session, user_id, [r[0] for r in rows])
    return _group_problem_books(rows, statuses)
