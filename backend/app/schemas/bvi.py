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
    """Этап сезона. dates_text — готовая подпись дат по-русски; starts_at — точный момент
    начала для обратного отсчёта (только у подтверждённых дат до дня, иначе null)."""

    kind: str
    subject: str | None
    title: str
    starts_on: date | None
    ends_on: date | None
    start_precision: str | None
    end_precision: str | None
    approximate: bool
    time_msk: str | None
    note: str | None
    dates_text: str
    starts_at: datetime | None


class BviOlympiadOut(BaseModel):
    id: str
    title: str
    short_title: str | None
    level: str
    organizer: str
    grades: str
    status: str
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
