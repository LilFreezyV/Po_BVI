"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-09-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

subject_enum = postgresql.ENUM("physics", "math", name="subject_enum")
level_enum = postgresql.ENUM("easy", "medium", "hard", name="level_enum")
# Отдельные ссылки с create_type=False для использования в Column(...): тип уже
# создаётся явно ниже (create(checkfirst=True)), иначе create_table попытается
# создать его повторно и упадёт с DuplicateObjectError.
subject_enum_col = postgresql.ENUM("physics", "math", name="subject_enum", create_type=False)
level_enum_col = postgresql.ENUM("easy", "medium", "hard", name="level_enum", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    subject_enum.create(bind, checkfirst=True)
    level_enum.create(bind, checkfirst=True)

    op.create_table(
        "sections",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("subject", subject_enum_col, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("hint", sa.String(length=500), nullable=False),
    )

    op.create_table(
        "topics",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("section_id", sa.String(length=64), sa.ForeignKey("sections.id"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("blurb", sa.Text(), nullable=False),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.Column("free", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("order_index", sa.Integer(), nullable=False, unique=True),
        sa.Column("theory_summary", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_topics_section_id", "topics", ["section_id"])

    op.create_table(
        "theory_points",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("topic_id", sa.String(length=64), sa.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.UniqueConstraint("topic_id", "position"),
    )
    op.create_index("ix_theory_points_topic_id", "theory_points", ["topic_id"])

    op.create_table(
        "tasks",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("topic_id", sa.String(length=64), sa.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False),
        sa.Column("level", level_enum_col, nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=255), nullable=False),
        sa.Column("hint", sa.Text(), nullable=True),
        sa.Column("solution", sa.Text(), nullable=True),
        sa.UniqueConstraint("topic_id", "level", "position"),
    )
    op.create_index("ix_tasks_topic_id", "tasks", ["topic_id"])

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
        sa.Column("olympiad_id", sa.String(length=64), sa.ForeignKey("olympiads.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("subject", subject_enum_col, primary_key=True),
    )

    op.create_table(
        "topic_olympiads",
        sa.Column("topic_id", sa.String(length=64), sa.ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("olympiad_id", sa.String(length=64), sa.ForeignKey("olympiads.id", ondelete="CASCADE"), primary_key=True),
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
        sa.Column("university_id", sa.String(length=64), sa.ForeignKey("universities.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("olympiad_id", sa.String(length=64), sa.ForeignKey("olympiads.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "plans",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("price_display", sa.String(length=64), nullable=False),
        sa.Column("price_kopecks", sa.Integer(), nullable=True),
        sa.Column("period", sa.String(length=64), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("cta", sa.String(length=255), nullable=False),
        sa.Column("accent", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "plan_features",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("plan_id", sa.String(length=32), sa.ForeignKey("plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("text", sa.String(length=500), nullable=False),
        sa.UniqueConstraint("plan_id", "position"),
    )
    op.create_index("ix_plan_features_plan_id", "plan_features", ["plan_id"])

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("grade", sa.String(length=64), nullable=True),
        sa.Column("goal", sa.String(length=255), nullable=True),
        sa.Column("target", sa.String(length=255), nullable=True),
        sa.Column("subscription_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("subscription_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "task_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", sa.String(length=32), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("solved", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("solved_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "task_id"),
    )
    op.create_index("ix_task_attempts_user_id", "task_attempts", ["user_id"])
    op.create_index("ix_task_attempts_task_id", "task_attempts", ["task_id"])


def downgrade() -> None:
    op.drop_table("task_attempts")
    op.drop_table("users")
    op.drop_table("plan_features")
    op.drop_table("plans")
    op.drop_table("university_olympiads")
    op.drop_table("universities")
    op.drop_table("topic_olympiads")
    op.drop_table("olympiad_subjects")
    op.drop_table("olympiads")
    op.drop_table("tasks")
    op.drop_table("theory_points")
    op.drop_table("topics")
    op.drop_table("sections")

    bind = op.get_bind()
    level_enum.drop(bind, checkfirst=True)
    subject_enum.drop(bind, checkfirst=True)
