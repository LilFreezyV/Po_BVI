from pydantic import BaseModel

from app.schemas.common import TopicProgressOut


class SubjectOut(BaseModel):
    id: str
    title: str


class SectionOut(BaseModel):
    id: str
    subject: str
    title: str
    hint: str


class TopicListItemOut(BaseModel):
    id: str
    section_id: str
    title: str
    blurb: str
    minutes: int
    free: bool
    order_index: int
    olympiad_ids: list[str]
    progress: TopicProgressOut


class TaskOut(BaseModel):
    id: str
    level: str
    text: str | None
    source: str | None
    hint: str | None
    solution: str | None
    locked: bool


class TheoryOut(BaseModel):
    summary: str
    points: list[str]


class OlympiadSummaryOut(BaseModel):
    id: str
    title: str
    organizer: str
    level: str


class TopicDetailOut(BaseModel):
    id: str
    section_id: str
    section_title: str
    subject: str
    title: str
    blurb: str
    minutes: int
    free: bool
    locked: bool
    theory: TheoryOut
    tasks: dict[str, list[TaskOut]]
    olympiads: list[OlympiadSummaryOut]
    progress: TopicProgressOut
    prev_topic_id: str | None
    next_topic_id: str | None


class OlympiadOut(BaseModel):
    id: str
    title: str
    subjects: list[str]
    level: str
    organizer: str
    dates: str
    grades: str
    perk: str
    note: str


class UniversityOut(BaseModel):
    id: str
    short: str
    title: str
    city: str
    programs: str
    accepts: list[OlympiadSummaryOut]
    confirm: str
    passing: str


class PlanOut(BaseModel):
    id: str
    title: str
    price_display: str
    period: str
    summary: str
    features: list[str]
    cta: str
    accent: bool
