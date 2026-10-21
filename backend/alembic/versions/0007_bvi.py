"""БВИ-навигатор: перечень олимпиад по физике и льготы вузов

Четыре таблицы: bvi_universities (столбцы сводной таблицы), bvi_olympiads (строки),
bvi_benefits (ячейки «победитель / призёр») и bvi_dates (ближайшие даты сезона).
Данные — scripts/bvi_data.py, сид пересобирает всё целиком.

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bvi_universities",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("short", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("winner", sa.Text(), nullable=False),
        sa.Column("prize", sa.Text(), nullable=False),
        sa.Column("ege", sa.Text(), nullable=False),
        sa.Column("grades", sa.Text(), nullable=False),
        sa.Column("draft_2027", sa.Text(), nullable=True),
    )
    op.create_table(
        "bvi_olympiads",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("level", sa.String(length=8), nullable=False),
        sa.Column("organizer", sa.String(length=255), nullable=False),
        sa.Column("grades", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("registration", sa.Text(), nullable=True),
        sa.Column("selection", sa.Text(), nullable=True),
        sa.Column("final", sa.Text(), nullable=True),
        sa.Column("site_url", sa.String(length=500), nullable=True),
        sa.Column("reg_url", sa.String(length=500), nullable=True),
        sa.Column("chat_url", sa.String(length=500), nullable=True),
        sa.Column("catalog_id", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["catalog_id"], ["olympiads.id"], ondelete="SET NULL"),
    )
    op.create_table(
        "bvi_benefits",
        sa.Column("olympiad_id", sa.String(length=64), primary_key=True),
        sa.Column("university_id", sa.String(length=64), primary_key=True),
        sa.Column("winner", sa.String(length=16), nullable=False),
        sa.Column("prize", sa.String(length=16), nullable=False),
        sa.ForeignKeyConstraint(["olympiad_id"], ["bvi_olympiads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["university_id"], ["bvi_universities.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "bvi_dates",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=64), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column("olympiad", sa.String(length=255), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("bvi_dates")
    op.drop_table("bvi_benefits")
    op.drop_table("bvi_olympiads")
    op.drop_table("bvi_universities")
