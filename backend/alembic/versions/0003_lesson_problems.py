"""lesson problems: задачи из задачников, привязанные к подтемам программы

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-18

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "problem_sources",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("authors", sa.String(length=255), nullable=False),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("license", sa.String(length=64), nullable=True),
        sa.Column("license_url", sa.String(length=500), nullable=True),
    )

    op.create_table(
        "lesson_problems",
        sa.Column("id", sa.String(length=96), primary_key=True),
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
        sa.Column("number", sa.String(length=32), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("figure", sa.String(length=255), nullable=True),
        sa.Column("answer_image", sa.String(length=255), nullable=True),
        sa.UniqueConstraint("source_id", "number"),
    )
    op.create_index("ix_lesson_problems_lesson_id", "lesson_problems", ["lesson_id"])


def downgrade() -> None:
    op.drop_table("lesson_problems")
    op.drop_table("problem_sources")
