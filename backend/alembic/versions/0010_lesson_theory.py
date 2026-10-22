"""конспекты у подтем программы

Раньше конспект жил у темы каталога (`topics.theory_summary` + `theory_points`), а тема
каталога покрывала примерно десяток подтем программы. По решению 2026-10-22 конспект
пишется на каждую подтему, поэтому текст переезжает к `curriculum_lessons`:
summary — абзац, curriculum_lesson_points — тезисы и формулы, figure — ключ анимации,
которой подтема иллюстрируется на странице конспекта.

Старые таблицы `topics`/`tasks` не трогаем: там остаются задачи, которые теперь
показываются в программе.

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("curriculum_lessons", sa.Column("summary", sa.Text(), nullable=True))
    op.add_column("curriculum_lessons", sa.Column("figure", sa.String(length=32), nullable=True))
    op.create_table(
        "curriculum_lesson_points",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("lesson_id", sa.String(length=96), nullable=False, index=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["lesson_id"], ["curriculum_lessons.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("curriculum_lesson_points")
    op.drop_column("curriculum_lessons", "figure")
    op.drop_column("curriculum_lessons", "summary")
