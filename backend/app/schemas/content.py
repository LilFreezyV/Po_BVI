from datetime import datetime

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
    status: str | None = None


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


class OlympiadStageOut(BaseModel):
    subject: str
    title: str
    starts_at: datetime
    note: str | None


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
    stages: list[OlympiadStageOut] = []


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


class LessonReferenceOut(BaseModel):
    source_id: str
    locator: str
    problems: str | None
    page: int | None
    solutions_page: int | None


class CurriculumLessonOut(BaseModel):
    id: str
    number: int
    title: str
    description: str
    # Классы, в которых встречается подтема: «Вязкое трение (9, 10, 11 класс)».
    grades: list[int]
    topic_id: str | None
    problem_count: int = 0
    references: list[LessonReferenceOut] = []


class CurriculumModuleOut(BaseModel):
    id: str
    title: str
    # Объединение классов подтем — чтобы подписать тему целиком.
    grades: list[int]
    lessons: list[CurriculumLessonOut]


class ProblemSourceOut(BaseModel):
    id: str
    title: str
    authors: str
    year: int | None
    license: str | None
    license_url: str | None


class LiteratureSourceOut(BaseModel):
    id: str
    kind: str
    category: str | None
    title: str
    short_title: str | None
    authors: str
    year: int | None
    url: str | None
    access_note: str | None
    annotation: str | None
    license: str | None
    license_url: str | None


class LessonProblemOut(BaseModel):
    id: str
    source_id: str
    number: str
    text: str
    figure: str | None
    answer_image: str | None
    status: str | None = None


class LessonProblemsOut(BaseModel):
    lesson_id: str
    problems: list[LessonProblemOut]
    sources: list[ProblemSourceOut]
