"""conspects: большие интерактивные конспекты тем целыми HTML-страницами

Таблицу заполняет не сид, а scripts/load_conspects.py из папки с файлами (в git их нет).
После деплоя с этой миграцией сид не нужен — нужна загрузка конспектов.

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

subject_enum_col = postgresql.ENUM("physics", "math", name="subject_enum", create_type=False)


def upgrade() -> None:
    op.create_table(
        "conspects",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("subject", subject_enum_col, nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("module_id", sa.String(length=96), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("html", sa.Text(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("subject", "number", name="uq_conspects_subject_number"),
    )


def downgrade() -> None:
    op.drop_table("conspects")
