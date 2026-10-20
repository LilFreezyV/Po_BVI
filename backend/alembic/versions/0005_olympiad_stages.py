"""olympiad stages: даты туров и заключительного этапа олимпиад по предметам

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-20

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

subject_enum_col = postgresql.ENUM("physics", "math", name="subject_enum", create_type=False)


def upgrade() -> None:
    op.create_table(
        "olympiad_stages",
        sa.Column("id", sa.String(length=96), primary_key=True),
        sa.Column(
            "olympiad_id",
            sa.String(length=64),
            sa.ForeignKey("olympiads.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("subject", subject_enum_col, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note", sa.String(length=255), nullable=True),
    )
    op.create_index("ix_olympiad_stages_olympiad_id", "olympiad_stages", ["olympiad_id"])


def downgrade() -> None:
    op.drop_table("olympiad_stages")
