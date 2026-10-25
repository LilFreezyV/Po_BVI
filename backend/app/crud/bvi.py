from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app import olympiad_dates
from app.bvi_meta import GENERAL_DATES, HIGHLIGHTS, LEGEND, SOURCES, UPDATED_ON
from app.models.content import BviOlympiad, BviUniversity, OlympiadStage
from app.schemas.bvi import (
    BviBenefitOut,
    BviDateOut,
    BviHighlightOut,
    BviLegendOut,
    BviOlympiadOut,
    BviOut,
    BviSourceOut,
    BviUniversityOut,
    OlympiadStageOut,
)


def stage_out(s: OlympiadStage) -> OlympiadStageOut:
    return OlympiadStageOut(
        kind=s.kind,
        subject=s.subject.value if s.subject is not None else None,
        title=s.title,
        starts_on=s.starts_on,
        ends_on=s.ends_on,
        start_precision=s.start_precision,
        end_precision=s.end_precision,
        approximate=s.approximate,
        time_msk=s.time_msk,
        note=s.note,
        dates_text=olympiad_dates.dates_text(s),
        starts_at=olympiad_dates.starts_at(s),
    )


async def load_olympiads(session: AsyncSession) -> list[BviOlympiad]:
    return (
        await session.scalars(
            select(BviOlympiad)
            .options(selectinload(BviOlympiad.benefits), selectinload(BviOlympiad.stages))
            .order_by(BviOlympiad.position)
        )
    ).all()


async def get_bvi(session: AsyncSession, today: date | None = None) -> BviOut:
    """Вся страница БВИ одним запросом: таблица меняется редко, разбивать смысла нет."""
    today = today or date.today()

    unis = (
        await session.scalars(select(BviUniversity).order_by(BviUniversity.position))
    ).all()
    olympiads = await load_olympiads(session)

    return BviOut(
        updated_on=UPDATED_ON,
        legend=[BviLegendOut(**x) for x in LEGEND],
        sources=[BviSourceOut(**x) for x in SOURCES],
        highlights=[BviHighlightOut(**x) for x in HIGHLIGHTS],
        universities=[
            BviUniversityOut(
                id=u.id, short=u.short, title=u.title, winner=u.winner,
                prize=u.prize, ege=u.ege, grades=u.grades, draft_2027=u.draft_2027,
            )
            for u in unis
        ],
        olympiads=[
            BviOlympiadOut(
                id=o.id, title=o.title, short_title=o.short_title, level=o.level,
                organizer=o.organizer, grades=o.grades, status=o.status, site_url=o.site_url,
                reg_url=o.reg_url, chat_url=o.chat_url, archive_url=o.archive_url,
                archive_note=o.archive_note,
                benefits=[
                    BviBenefitOut(university_id=b.university_id, winner=b.winner, prize=b.prize)
                    for b in o.benefits
                ],
                stages=[stage_out(s) for s in o.stages],
            )
            for o in olympiads
        ],
        # Календарь строится из этапов; прошедшее не показываем — список быстро стал бы архивом.
        dates=[BviDateOut(**item) for item in olympiad_dates.calendar_items(olympiads, today, GENERAL_DATES)],
    )
