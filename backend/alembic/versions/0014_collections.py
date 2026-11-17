"""Independent physics problem collections.

Revision ID: 0014
Revises: 0013
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "collection_books",
        sa.Column("slug", sa.String(60), primary_key=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("metadata_json", JSONB(), nullable=False),
    )
    op.create_table(
        "collection_chapters",
        sa.Column("book", sa.String(60), sa.ForeignKey("collection_books.slug", ondelete="CASCADE"), primary_key=True),
        sa.Column("number", sa.Integer(), primary_key=True),
        sa.Column("html", sa.Text(), nullable=False),
    )
    op.create_table(
        "collection_tasks",
        sa.Column("book", sa.String(60), primary_key=True),
        sa.Column("chapter", sa.Integer(), primary_key=True),
        sa.Column("anchor", sa.String(120), primary_key=True),
        sa.Column("number", sa.Text(), nullable=False),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(
            ("book", "chapter"), ("collection_chapters.book", "collection_chapters.number"), ondelete="CASCADE",
        ),
    )
    op.create_table(
        "collection_assets",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("mime", sa.String(40), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
    )


def downgrade():
    op.drop_table("collection_assets")
    op.drop_table("collection_tasks")
    op.drop_table("collection_chapters")
    op.drop_table("collection_books")
