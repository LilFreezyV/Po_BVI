from sqlalchemy import ForeignKey, ForeignKeyConstraint, Integer, LargeBinary, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CollectionBook(Base):
    __tablename__ = "collection_books"

    slug: Mapped[str] = mapped_column(String(60), primary_key=True)
    position: Mapped[int]
    metadata_json: Mapped[dict] = mapped_column(JSONB)


class CollectionChapter(Base):
    __tablename__ = "collection_chapters"

    book: Mapped[str] = mapped_column(ForeignKey("collection_books.slug", ondelete="CASCADE"), primary_key=True)
    number: Mapped[int] = mapped_column(Integer, primary_key=True)
    html: Mapped[str] = mapped_column(Text)


class CollectionTask(Base):
    __tablename__ = "collection_tasks"
    __table_args__ = (
        ForeignKeyConstraint(
            ("book", "chapter"), ("collection_chapters.book", "collection_chapters.number"),
            ondelete="CASCADE",
        ),
    )

    book: Mapped[str] = mapped_column(String(60), primary_key=True)
    chapter: Mapped[int] = mapped_column(Integer, primary_key=True)
    anchor: Mapped[str] = mapped_column(String(120), primary_key=True)
    number: Mapped[str] = mapped_column(Text)
    statement: Mapped[str] = mapped_column(Text)


class CollectionAsset(Base):
    __tablename__ = "collection_assets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    mime: Mapped[str] = mapped_column(String(40))
    data: Mapped[bytes] = mapped_column(LargeBinary)
