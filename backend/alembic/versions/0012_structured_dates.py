"""structured dates: даты сезона олимпиад структурой + снимки страниц для наблюдения за датами

* olympiad_stages пересоздаётся с полями этапа (вид, даты с/по, точность до дня или месяца,
  «ориентировочно», время по Москве, предмет, примечание) — заполняет сид;
* у bvi_olympiads удаляются текстовые registration/selection/final, добавляются short_title
  (короткое имя для календаря и сообщений бота) и dates_url (какую страницу сторожить);
* bvi_dates (календарь текстом) удаляется — календарь строится из этапов;
* date_watch_snapshots — последний снимок строк с датами у каждой страницы. Внешнего ключа на
  bvi_olympiads нет намеренно: сид пересобирает навигатор (delete + insert), а снимки должны
  переживать сид, иначе после каждого сида изменения на сайтах терялись бы.

После деплоя с этой миграцией нужен сид.

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-25

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

subject_enum_col = postgresql.ENUM("physics", "math", name="subject_enum", create_type=False)


def upgrade() -> None:
    op.drop_table("olympiad_stages")
    op.create_table(
        "olympiad_stages",
        sa.Column("id", sa.String(length=96), primary_key=True),
        sa.Column(
            "olympiad_id", sa.String(length=64), sa.ForeignKey("bvi_olympiads.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("subject", subject_enum_col, nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("starts_on", sa.Date(), nullable=True),
        sa.Column("start_precision", sa.String(length=8), nullable=True),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column("end_precision", sa.String(length=8), nullable=True),
        sa.Column("approximate", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("settled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("time_msk", sa.String(length=5), nullable=True),
        sa.Column("note", sa.String(length=255), nullable=True),
        sa.CheckConstraint("kind in ('registration', 'selection', 'final')", name="ck_olympiad_stages_kind"),
        sa.CheckConstraint("start_precision in ('day', 'month')", name="ck_olympiad_stages_start_precision"),
        sa.CheckConstraint("end_precision in ('day', 'month')", name="ck_olympiad_stages_end_precision"),
    )
    op.create_index("ix_olympiad_stages_olympiad_id", "olympiad_stages", ["olympiad_id"])

    for column in ("registration", "selection", "final"):
        op.drop_column("bvi_olympiads", column)
    op.add_column("bvi_olympiads", sa.Column("short_title", sa.String(length=64), nullable=True))
    op.add_column("bvi_olympiads", sa.Column("dates_url", sa.String(length=500), nullable=True))

    op.drop_table("bvi_dates")

    op.create_table(
        "date_watch_snapshots",
        sa.Column("olympiad_id", sa.String(length=64), primary_key=True),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("content_hash", sa.String(length=64), nullable=True),
        sa.Column("excerpt", sa.Text(), nullable=True),
        sa.Column("error", sa.String(length=255), nullable=True),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failing_since", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Структура до 0012 возвращается пустой; данные — сидом из версии кода до 0012."""
    op.drop_table("date_watch_snapshots")
    op.create_table(
        "bvi_dates",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=64), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column("olympiad", sa.String(length=255), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
    )
    op.drop_column("bvi_olympiads", "dates_url")
    op.drop_column("bvi_olympiads", "short_title")
    for column in ("registration", "selection", "final"):
        op.add_column("bvi_olympiads", sa.Column(column, sa.Text(), nullable=True))

    op.drop_table("olympiad_stages")
    op.create_table(
        "olympiad_stages",
        sa.Column("id", sa.String(length=96), primary_key=True),
        sa.Column(
            "olympiad_id", sa.String(length=64), sa.ForeignKey("bvi_olympiads.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("subject", subject_enum_col, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note", sa.String(length=255), nullable=True),
    )
    op.create_index("ix_olympiad_stages_olympiad_id", "olympiad_stages", ["olympiad_id"])
