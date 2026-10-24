from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.content import BviDate, BviOlympiad, BviUniversity
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
from app.bvi_meta import HIGHLIGHTS, LEGEND, SOURCES, UPDATED_ON


async def get_bvi(session: AsyncSession, today: date | None = None) -> BviOut:
    """Вся страница БВИ одним запросом: таблица меняется редко, разбивать смысла нет."""
    today = today or date.today()

    unis = (
        await session.scalars(select(BviUniversity).order_by(BviUniversity.position))
    ).all()
    olympiads = (
        await session.scalars(
            select(BviOlympiad)
            .options(selectinload(BviOlympiad.benefits), selectinload(BviOlympiad.stages))
            .order_by(BviOlympiad.position)
        )
    ).all()
    dates = (await session.scalars(select(BviDate).order_by(BviDate.position))).all()

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
                id=o.id, title=o.title, level=o.level, organizer=o.organizer,
                grades=o.grades, status=o.status, registration=o.registration,
                selection=o.selection, final=o.final, site_url=o.site_url,
                reg_url=o.reg_url, chat_url=o.chat_url, archive_url=o.archive_url,
                archive_note=o.archive_note,
                benefits=[
                    BviBenefitOut(university_id=b.university_id, winner=b.winner, prize=b.prize)
                    for b in o.benefits
                ],
                stages=[
                    OlympiadStageOut(subject=s.subject.value, title=s.title, starts_at=s.starts_at, note=s.note)
                    for s in o.stages
                ],
            )
            for o in olympiads
        ],
        # Прошедшее не показываем: список дат быстро превращается в архив.
        dates=[
            BviDateOut(label=d.label, ends_on=d.ends_on, olympiad=d.olympiad, note=d.note)
            for d in dates
            if d.ends_on is None or d.ends_on >= today
        ],
    )
