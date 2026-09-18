"""curriculum: программа по классам (тема → подтема)

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-18

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Тип subject_enum уже создан в 0001 — только ссылаемся на него.
subject_enum_col = postgresql.ENUM("physics", "math", name="subject_enum", create_type=False)


def upgrade() -> None:
    op.create_table(
        "curriculum_modules",
        sa.Column("id", sa.String(length=96), primary_key=True),
        sa.Column("subject", subject_enum_col, nullable=False),
        sa.Column("grade", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.UniqueConstraint("subject", "grade", "position"),
    )

    op.create_table(
        "curriculum_lessons",
        sa.Column("id", sa.String(length=96), primary_key=True),
        sa.Column(
            "module_id",
            sa.String(length=96),
            sa.ForeignKey("curriculum_modules.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("topic_id", sa.String(length=64), sa.ForeignKey("topics.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_curriculum_lessons_module_id", "curriculum_lessons", ["module_id"])


def downgrade() -> None:
    op.drop_table("curriculum_lessons")
    op.drop_table("curriculum_modules")
