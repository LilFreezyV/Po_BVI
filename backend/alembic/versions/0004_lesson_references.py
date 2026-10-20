"""lesson references: литература по предмету и ссылки на главы/задачи книг у подтем программы

Тексты задач из книг под обычным авторским правом не копируются — у подтемы хранится
только ссылка: какая глава/параграф, какие номера задач, на какой странице PDF.

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-20

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

subject_enum_col = postgresql.ENUM("physics", "math", name="subject_enum", create_type=False)


def upgrade() -> None:
    op.add_column("problem_sources", sa.Column("subject", subject_enum_col, nullable=True))
    op.add_column("problem_sources", sa.Column("short_title", sa.String(length=128), nullable=True))
    op.add_column(
        "problem_sources", sa.Column("kind", sa.String(length=16), nullable=False, server_default="book")
    )
    op.add_column("problem_sources", sa.Column("category", sa.String(length=64), nullable=True))
    op.add_column(
        "problem_sources", sa.Column("position", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column("problem_sources", sa.Column("url", sa.String(length=500), nullable=True))
    op.add_column("problem_sources", sa.Column("access_note", sa.String(length=255), nullable=True))
    op.add_column("problem_sources", sa.Column("annotation", sa.Text(), nullable=True))

    op.create_table(
        "lesson_references",
        sa.Column("id", sa.String(length=128), primary_key=True),
        sa.Column(
            "lesson_id",
            sa.String(length=96),
            sa.ForeignKey("curriculum_lessons.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "source_id",
            sa.String(length=64),
            sa.ForeignKey("problem_sources.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("locator", sa.String(length=255), nullable=False),
        sa.Column("problems", sa.String(length=64), nullable=True),
        sa.Column("page", sa.Integer(), nullable=True),
        sa.Column("solutions_page", sa.Integer(), nullable=True),
    )
    op.create_index("ix_lesson_references_lesson_id", "lesson_references", ["lesson_id"])


def downgrade() -> None:
    op.drop_table("lesson_references")
    for column in ("annotation", "access_note", "url", "position", "category", "kind", "short_title", "subject"):
        op.drop_column("problem_sources", column)
