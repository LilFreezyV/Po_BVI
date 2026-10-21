"""архив заданий прошлых лет: ссылка на официальную страницу олимпиады

Тексты заданий мы не храним — только ведём на первоисточник, поэтому хватает двух
полей у олимпиады: адрес раздела и как он называется на сайте.

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("bvi_olympiads", sa.Column("archive_url", sa.String(length=500), nullable=True))
    op.add_column("bvi_olympiads", sa.Column("archive_note", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("bvi_olympiads", "archive_note")
    op.drop_column("bvi_olympiads", "archive_url")
