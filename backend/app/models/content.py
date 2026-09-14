from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.enums import LevelEnum, SubjectEnum

SubjectType = SAEnum(SubjectEnum, name="subject_enum")
LevelType = SAEnum(LevelEnum, name="level_enum")


class Section(Base):
    __tablename__ = "sections"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    subject: Mapped[SubjectEnum] = mapped_column(SubjectType, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    hint: Mapped[str] = mapped_column(String(500), nullable=False)

    topics: Mapped[list["Topic"]] = relationship(back_populates="section", order_by="Topic.order_index")


class Topic(Base, TimestampMixin):
    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    section_id: Mapped[str] = mapped_column(ForeignKey("sections.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    blurb: Mapped[str] = mapped_column(Text, nullable=False)
    minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    free: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    theory_summary: Mapped[str] = mapped_column(Text, nullable=False)

    section: Mapped["Section"] = relationship(back_populates="topics")
    theory_points: Mapped[list["TheoryPoint"]] = relationship(
        back_populates="topic", order_by="TheoryPoint.position", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="topic", order_by="Task.level, Task.position", cascade="all, delete-orphan"
    )
    olympiad_links: Mapped[list["TopicOlympiad"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan"
    )


class TheoryPoint(Base):
    __tablename__ = "theory_points"
    __table_args__ = (UniqueConstraint("topic_id", "position"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    topic: Mapped["Topic"] = relationship(back_populates="theory_points")


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (UniqueConstraint("topic_id", "level", "position"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    level: Mapped[LevelEnum] = mapped_column(LevelType, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    solution: Mapped[str | None] = mapped_column(Text, nullable=True)

    topic: Mapped["Topic"] = relationship(back_populates="tasks")


class Olympiad(Base):
    __tablename__ = "olympiads"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    level: Mapped[str] = mapped_column(String(255), nullable=False)
    organizer: Mapped[str] = mapped_column(String(255), nullable=False)
    dates: Mapped[str] = mapped_column(String(255), nullable=False)
    grades: Mapped[str] = mapped_column(String(64), nullable=False)
    perk: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)

    subject_links: Mapped[list["OlympiadSubject"]] = relationship(
        back_populates="olympiad", cascade="all, delete-orphan"
    )
    topic_links: Mapped[list["TopicOlympiad"]] = relationship(
        back_populates="olympiad", cascade="all, delete-orphan"
    )
    university_links: Mapped[list["UniversityOlympiad"]] = relationship(
        back_populates="olympiad", cascade="all, delete-orphan"
    )


class OlympiadSubject(Base):
    __tablename__ = "olympiad_subjects"

    olympiad_id: Mapped[str] = mapped_column(ForeignKey("olympiads.id", ondelete="CASCADE"), primary_key=True)
    subject: Mapped[SubjectEnum] = mapped_column(SubjectType, primary_key=True)

    olympiad: Mapped["Olympiad"] = relationship(back_populates="subject_links")


class TopicOlympiad(Base):
    __tablename__ = "topic_olympiads"

    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True)
    olympiad_id: Mapped[str] = mapped_column(ForeignKey("olympiads.id", ondelete="CASCADE"), primary_key=True)

    topic: Mapped["Topic"] = relationship(back_populates="olympiad_links")
    olympiad: Mapped["Olympiad"] = relationship(back_populates="topic_links")


class University(Base):
    __tablename__ = "universities"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    short: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(255), nullable=False)
    programs: Mapped[str] = mapped_column(String(500), nullable=False)
    confirm: Mapped[str] = mapped_column(String(255), nullable=False)
    passing: Mapped[str] = mapped_column(String(255), nullable=False)

    olympiad_links: Mapped[list["UniversityOlympiad"]] = relationship(
        back_populates="university", cascade="all, delete-orphan"
    )


class UniversityOlympiad(Base):
    __tablename__ = "university_olympiads"

    university_id: Mapped[str] = mapped_column(ForeignKey("universities.id", ondelete="CASCADE"), primary_key=True)
    olympiad_id: Mapped[str] = mapped_column(ForeignKey("olympiads.id", ondelete="CASCADE"), primary_key=True)

    university: Mapped["University"] = relationship(back_populates="olympiad_links")
    olympiad: Mapped["Olympiad"] = relationship(back_populates="university_links")


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    price_display: Mapped[str] = mapped_column(String(64), nullable=False)
    price_kopecks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    period: Mapped[str] = mapped_column(String(64), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    cta: Mapped[str] = mapped_column(String(255), nullable=False)
    accent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    features: Mapped[list["PlanFeature"]] = relationship(
        back_populates="plan", order_by="PlanFeature.position", cascade="all, delete-orphan"
    )


class PlanFeature(Base):
    __tablename__ = "plan_features"
    __table_args__ = (UniqueConstraint("plan_id", "position"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_id: Mapped[str] = mapped_column(ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(String(500), nullable=False)

    plan: Mapped["Plan"] = relationship(back_populates="features")
