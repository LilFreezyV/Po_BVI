"""drop old olympiads/universities: всё про олимпиады и вузы — в таблицах навигатора bvi_*

Удаляются olympiads, olympiad_subjects, universities, university_olympiads и
bvi_olympiads.catalog_id. topic_olympiads и olympiad_stages пересоздаются с внешним ключом
на bvi_olympiads — пустыми: их заполняет сид (id олимпиад поменялись, phystech → fizteh),
поэтому после этой миграции обязательно `python -m scripts.seed`.

Revision ID: 0011
Revises: 0010
Create Date: 2026-10-24

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

subject_enum_col = postgresql.ENUM("physics", "math", name="subject_enum", create_type=False)


def _stages(target: str) -> None:
    op.create_table(
        "olympiad_stages",
        sa.Column("id", sa.String(length=96), primary_key=True),
        sa.Column(
            "olympiad_id", sa.String(length=64), sa.ForeignKey(f"{target}.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("subject", subject_enum_col, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note", sa.String(length=255), nullable=True),
    )
    op.create_index("ix_olympiad_stages_olympiad_id", "olympiad_stages", ["olympiad_id"])


def _topic_links(target: str) -> None:
    op.create_table(
        "topic_olympiads",
        sa.Column("topic_id", sa.String(length=64), sa.ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True),
        sa.Column(
            "olympiad_id", sa.String(length=64), sa.ForeignKey(f"{target}.id", ondelete="CASCADE"), primary_key=True
        ),
    )


def upgrade() -> None:
    op.drop_table("topic_olympiads")
    op.drop_table("olympiad_stages")
    op.drop_column("bvi_olympiads", "catalog_id")
    op.drop_table("university_olympiads")
    op.drop_table("universities")
    op.drop_table("olympiad_subjects")
    op.drop_table("olympiads")

    _topic_links("bvi_olympiads")
    _stages("bvi_olympiads")


def downgrade() -> None:
    """Структура старых таблиц возвращается пустой; данные — сидом из версии кода до 0011."""
    op.drop_table("olympiad_stages")
    op.drop_table("topic_olympiads")

    op.create_table(
        "olympiads",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("level", sa.String(length=255), nullable=False),
        sa.Column("organizer", sa.String(length=255), nullable=False),
        sa.Column("dates", sa.String(length=255), nullable=False),
        sa.Column("grades", sa.String(length=64), nullable=False),
        sa.Column("perk", sa.Text(), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
    )
    op.create_table(
        "olympiad_subjects",
        sa.Column(
            "olympiad_id", sa.String(length=64), sa.ForeignKey("olympiads.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("subject", subject_enum_col, primary_key=True),
    )
    op.create_table(
        "universities",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("short", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("city", sa.String(length=255), nullable=False),
        sa.Column("programs", sa.String(length=500), nullable=False),
        sa.Column("confirm", sa.String(length=255), nullable=False),
        sa.Column("passing", sa.String(length=255), nullable=False),
    )
    op.create_table(
        "university_olympiads",
        sa.Column(
            "university_id", sa.String(length=64), sa.ForeignKey("universities.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "olympiad_id", sa.String(length=64), sa.ForeignKey("olympiads.id", ondelete="CASCADE"), primary_key=True
        ),
    )
    op.add_column(
        "bvi_olympiads",
        sa.Column(
            "catalog_id", sa.String(length=64), sa.ForeignKey("olympiads.id", ondelete="SET NULL"), nullable=True
        ),
    )
    _topic_links("olympiads")
    _stages("olympiads")
