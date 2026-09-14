import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import Section, Task, Topic
from app.models.enums import LevelEnum
from app.models.progress import TaskAttempt
from app.schemas.common import TopicProgressOut
from app.schemas.progress import ContinueItemOut, ProgressOverviewOut, SubjectSummaryOut, WeakSpotOut


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
                    TaskAttempt.solved.is_(True),
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
                    TaskAttempt.solved.is_(True),
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
    )


async def get_continue_list(
    session: AsyncSession, user_id: uuid.UUID, limit: int = 3
) -> list[ContinueItemOut]:
    progress_map = await get_topic_progress_map(session, user_id)
    in_progress_ids = [topic_id for topic_id, p in progress_map.items() if p.status == "progress"]
    if not in_progress_ids:
        return []

    last_attempt_stmt = (
        select(Task.topic_id, func.max(TaskAttempt.solved_at))
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
                TaskAttempt.solved.is_(True),
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


async def record_attempt(
    session: AsyncSession, user_id: uuid.UUID, task_id: str, solved: bool
) -> Task | None:
    task = await session.get(Task, task_id)
    if task is None:
        return None

    stmt = (
        pg_insert(TaskAttempt)
        .values(id=uuid.uuid4(), user_id=user_id, task_id=task_id, solved=solved)
        .on_conflict_do_update(
            index_elements=[TaskAttempt.user_id, TaskAttempt.task_id],
            set_={"solved": solved, "solved_at": func.now()},
        )
    )
    await session.execute(stmt)
    await session.commit()
    return task
