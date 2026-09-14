from pydantic import BaseModel

from app.schemas.common import TopicProgressOut


class TopicProgressItemOut(TopicProgressOut):
    topic_id: str


class TaskAttemptIn(BaseModel):
    task_id: str
    solved: bool = True


class TaskAttemptResponseOut(BaseModel):
    task_id: str
    solved: bool
    topic_id: str
    topic_progress: TopicProgressOut


class SubjectSummaryOut(BaseModel):
    subject: str
    percent: int
    done: int
    total: int


class ProgressOverviewOut(BaseModel):
    done: int
    progress: int
    new: int
    solved_tasks: int
    total_tasks: int


class ContinueItemOut(BaseModel):
    topic_id: str
    title: str
    section_title: str
    percent: int
    remaining: int


class WeakSpotOut(BaseModel):
    topic_id: str
    title: str
    reason: str
