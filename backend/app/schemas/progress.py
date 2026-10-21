from typing import Literal

from pydantic import BaseModel

from app.schemas.common import TopicProgressOut

AttemptStatus = Literal["solved", "question"]


class TopicProgressItemOut(TopicProgressOut):
    topic_id: str


class TaskAttemptIn(BaseModel):
    task_id: str
    status: AttemptStatus | None


class TaskAttemptResponseOut(BaseModel):
    task_id: str
    status: AttemptStatus | None
    topic_id: str
    topic_progress: TopicProgressOut


class ProblemAttemptIn(BaseModel):
    problem_id: str
    status: AttemptStatus | None


class ProblemAttemptResponseOut(BaseModel):
    problem_id: str
    status: AttemptStatus | None


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
    questions: int = 0


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


class QuestionItemOut(BaseModel):
    kind: Literal["task", "problem"]
    id: str
    title: str
    subtitle: str
    excerpt: str
    topic_id: str | None
    lesson_id: str | None


class ProblemBookModuleOut(BaseModel):
    module_id: str
    title: str
    total: int
    solved: int
    questions: int


class ProblemBookProgressOut(BaseModel):
    source_id: str
    title: str
    subject: str
    total: int
    solved: int
    questions: int
    modules: list[ProblemBookModuleOut]
