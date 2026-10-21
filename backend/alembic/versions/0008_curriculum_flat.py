"""программа одним списком: у тем больше нет класса, у подтем появились классы

curriculum_modules: убираем grade (тема теперь сквозная, «Кинематика» одна на все классы),
уникальность становится (subject, position). curriculum_lessons: добавляем grades —
строку вида «9,11» с классами, в которых подтема встречается.

Данные пересобирает сид (delete + insert), поэтому переносить строки не нужно:
после миграции обязателен `python -m scripts.seed`.

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "curriculum_lessons",
        sa.Column("grades", sa.String(length=32), nullable=False, server_default=""),
    )
    op.alter_column("curriculum_lessons", "grades", server_default=None)

    # Старые строки нумеровались внутри класса, поэтому (subject, position) у них
    # повторяется и новая уникальность на них не встанет. Данные целиком пересобирает
    # сид, так что просто чистим таблицу: подтемы, задачи к ним и ссылки на литературу
    # уйдут каскадом. Отметки учеников (problem_attempts) не привязаны внешним ключом
    # и переживут это — см. комментарий к миграции 0006.
    op.execute("DELETE FROM curriculum_modules")

    # Старая уникальность включала класс — без него она бы запрещала вторую тему предмета.
    op.drop_constraint("curriculum_modules_subject_grade_position_key", "curriculum_modules", type_="unique")
    op.drop_column("curriculum_modules", "grade")
    op.create_unique_constraint(
        "curriculum_modules_subject_position_key", "curriculum_modules", ["subject", "position"]
    )


def downgrade() -> None:
    op.drop_constraint("curriculum_modules_subject_position_key", "curriculum_modules", type_="unique")
    op.add_column(
        "curriculum_modules",
        sa.Column("grade", sa.Integer(), nullable=False, server_default="9"),
    )
    op.alter_column("curriculum_modules", "grade", server_default=None)
    op.create_unique_constraint(
        "curriculum_modules_subject_grade_position_key",
        "curriculum_modules",
        ["subject", "grade", "position"],
    )
    op.drop_column("curriculum_lessons", "grades")
