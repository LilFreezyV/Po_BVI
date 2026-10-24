from datetime import date, datetime

from pydantic import BaseModel


class BviLegendOut(BaseModel):
    code: str
    label: str
    text: str


class BviSourceOut(BaseModel):
    title: str
    note: str
    url: str | None


class BviHighlightOut(BaseModel):
    title: str
    text: str
    tone: str


class BviUniversityOut(BaseModel):
    id: str
    short: str
    title: str
    winner: str
    prize: str
    ege: str
    grades: str
    draft_2027: str | None


class BviBenefitOut(BaseModel):
    """Ячейка таблицы: коды льгот для победителя и призёра."""

    university_id: str
    winner: str
    prize: str


class OlympiadStageOut(BaseModel):
    """Тур с точной датой — для обратного отсчёта на главной."""

    subject: str
    title: str
    starts_at: datetime
    note: str | None


class BviOlympiadOut(BaseModel):
    id: str
    title: str
    level: str
    organizer: str
    grades: str
    status: str
    registration: str | None
    selection: str | None
    final: str | None
    site_url: str | None
    reg_url: str | None
    chat_url: str | None
    archive_url: str | None
    archive_note: str | None
    benefits: list[BviBenefitOut]
    stages: list[OlympiadStageOut] = []


class BviDateOut(BaseModel):
    label: str
    ends_on: date | None
    olympiad: str
    note: str


class BviOut(BaseModel):
    updated_on: date
    legend: list[BviLegendOut]
    sources: list[BviSourceOut]
    highlights: list[BviHighlightOut]
    universities: list[BviUniversityOut]
    olympiads: list[BviOlympiadOut]
    dates: list[BviDateOut]
