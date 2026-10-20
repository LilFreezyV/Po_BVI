"""attempt status: «решена» / «есть вопросы» у задач тем и задач из сборников

task_attempts: solved (bool) → status ('solved' | 'question'); строки solved=false удаляются —
«не решена» теперь означает отсутствие строки. solved_at → updated_at.
problem_attempts: то же для задач из задачников (lesson_problems). Внешнего ключа на
lesson_problems нет намеренно: сид пересоздаёт эти строки (delete + insert) с теми же id,
и каскад стирал бы отметки пользователей.

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-20

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("task_attempts", sa.Column("status", sa.String(length=16), nullable=True))
    op.execute("DELETE FROM task_attempts WHERE solved = false")
    op.execute("UPDATE task_attempts SET status = 'solved'")
    op.alter_column("task_attempts", "status", nullable=False)
    op.drop_column("task_attempts", "solved")
    op.alter_column("task_attempts", "solved_at", new_column_name="updated_at")

    op.create_table(
        "problem_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("problem_id", sa.String(length=96), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.UniqueConstraint("user_id", "problem_id"),
    )
    op.create_index("ix_problem_attempts_user_id", "problem_attempts", ["user_id"])


def downgrade() -> None:
    op.drop_table("problem_attempts")
    op.alter_column("task_attempts", "updated_at", new_column_name="solved_at")
    op.add_column(
        "task_attempts", sa.Column("solved", sa.Boolean(), nullable=False, server_default=sa.true())
    )
    op.execute("DELETE FROM task_attempts WHERE status <> 'solved'")
    op.drop_column("task_attempts", "status")
