from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
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


class OlympiadStage(Base):
    """Этап сезона олимпиады навигатора: регистрация, тур отбора или финал.

    Даты с точностью до дня или месяца (`*_precision`); при точности «месяц» starts_on —
    первое число месяца, ends_on — последнее. Нет дат — этап известен, а сроки нет (см. note).
    """

    __tablename__ = "olympiad_stages"

    id: Mapped[str] = mapped_column(String(96), primary_key=True)
    olympiad_id: Mapped[str] = mapped_column(
        ForeignKey("bvi_olympiads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    subject: Mapped[SubjectEnum | None] = mapped_column(SubjectType, nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    starts_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_precision: Mapped[str | None] = mapped_column(String(8), nullable=True)
    ends_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_precision: Mapped[str | None] = mapped_column(String(8), nullable=True)
    approximate: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Точнее сроки не станут (назначает каждый регион и т. п.) — бот не напоминает уточнить.
    settled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    time_msk: Mapped[str | None] = mapped_column(String(5), nullable=True)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)


class DateWatchSnapshot(Base):
    """Последний снимок строк с датами со страницы олимпиады (app/date_watch.py).
    Без внешнего ключа: сид пересобирает навигатор, а снимки должны его пережить."""

    __tablename__ = "date_watch_snapshots"

    olympiad_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(String(255), nullable=True)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failing_since: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class TopicOlympiad(Base):
    """Тема каталога ↔ олимпиада навигатора («Где встречается» на странице темы)."""

    __tablename__ = "topic_olympiads"

    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True)
    olympiad_id: Mapped[str] = mapped_column(ForeignKey("bvi_olympiads.id", ondelete="CASCADE"), primary_key=True)

    topic: Mapped["Topic"] = relationship(back_populates="olympiad_links")
    olympiad: Mapped["BviOlympiad"] = relationship()


class CurriculumModule(Base):
    """Крупная тема программы («Кинематика»). Без деления на классы: классы темы —
    объединение классов её подтем, см. CurriculumLesson.grades."""

    __tablename__ = "curriculum_modules"
    __table_args__ = (UniqueConstraint("subject", "position"),)

    id: Mapped[str] = mapped_column(String(96), primary_key=True)
    subject: Mapped[SubjectEnum] = mapped_column(SubjectType, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)

    lessons: Mapped[list["CurriculumLesson"]] = relationship(
        back_populates="module", order_by="CurriculumLesson.number", cascade="all, delete-orphan"
    )


class CurriculumLesson(Base):
    """Подтема (урок) внутри темы программы. topic_id — необязательная ссылка на тему с задачами."""

    __tablename__ = "curriculum_lessons"

    id: Mapped[str] = mapped_column(String(96), primary_key=True)
    module_id: Mapped[str] = mapped_column(
        ForeignKey("curriculum_modules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    topic_id: Mapped[str | None] = mapped_column(ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    # Классы, в которых встречается подтема, через запятую: «9,11».
    grades: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    # Конспект подтемы: абзац объяснения и ключ анимации, которой он иллюстрируется.
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    figure: Mapped[str | None] = mapped_column(String(32), nullable=True)

    module: Mapped["CurriculumModule"] = relationship(back_populates="lessons")
    problems: Mapped[list["LessonProblem"]] = relationship(
        back_populates="lesson", order_by="LessonProblem.position", cascade="all, delete-orphan"
    )
    points: Mapped[list["CurriculumLessonPoint"]] = relationship(
        back_populates="lesson", order_by="CurriculumLessonPoint.position", cascade="all, delete-orphan"
    )
    references: Mapped[list["LessonReference"]] = relationship(
        order_by="LessonReference.position", cascade="all, delete-orphan"
    )


class CurriculumLessonPoint(Base):
    """Тезис или формула в конспекте подтемы."""

    __tablename__ = "curriculum_lesson_points"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lesson_id: Mapped[str] = mapped_column(
        ForeignKey("curriculum_lessons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    lesson: Mapped["CurriculumLesson"] = relationship(back_populates="points")


class ProblemSource(Base):
    """Книга или сайт из списка литературы. Тексты задач копируются (LessonProblem) только
    из источников со свободной лицензией; на остальные подтемы ссылаются (LessonReference)."""

    __tablename__ = "problem_sources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    authors: Mapped[str] = mapped_column(String(255), nullable=False)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    license: Mapped[str | None] = mapped_column(String(64), nullable=True)
    license_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    subject: Mapped[SubjectEnum | None] = mapped_column(SubjectType, nullable=True)
    short_title: Mapped[str | None] = mapped_column(String(128), nullable=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default="book")
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    access_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    annotation: Mapped[str | None] = mapped_column(Text, nullable=True)


class LessonReference(Base):
    """Ссылка подтемы на главу/параграф книги: без текста задач, только где их искать."""

    __tablename__ = "lesson_references"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(
        ForeignKey("curriculum_lessons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_id: Mapped[str] = mapped_column(ForeignKey("problem_sources.id", ondelete="CASCADE"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    locator: Mapped[str] = mapped_column(String(255), nullable=False)
    problems: Mapped[str | None] = mapped_column(String(64), nullable=True)
    page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    solutions_page: Mapped[int | None] = mapped_column(Integer, nullable=True)


class LessonProblem(Base):
    """Задача из задачника, привязанная к подтеме программы. Рисунок и ответ — картинки из
    public/problems/<source>/ (fig/, ans/), пути относительные."""

    __tablename__ = "lesson_problems"
    __table_args__ = (UniqueConstraint("source_id", "number"),)

    id: Mapped[str] = mapped_column(String(96), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(
        ForeignKey("curriculum_lessons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_id: Mapped[str] = mapped_column(ForeignKey("problem_sources.id", ondelete="CASCADE"), nullable=False)
    number: Mapped[str] = mapped_column(String(32), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    figure: Mapped[str | None] = mapped_column(String(255), nullable=True)
    answer_image: Mapped[str | None] = mapped_column(String(255), nullable=True)

    lesson: Mapped["CurriculumLesson"] = relationship(back_populates="problems")
    source: Mapped["ProblemSource"] = relationship()


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


# ——— БВИ-навигатор ———
# Единственный источник про олимпиады и вузы: весь перечень по физике плюс ВсОШ
# (олимпиады × 11 вузов-столбцов) со ссылками на первоисточники. Старые таблицы
# olympiads/universities удалены в миграции 0011; темы каталога и даты туров ссылаются сюда.


class BviUniversity(Base):
    __tablename__ = "bvi_universities"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    short: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    winner: Mapped[str] = mapped_column(Text, nullable=False)
    prize: Mapped[str] = mapped_column(Text, nullable=False)
    ege: Mapped[str] = mapped_column(Text, nullable=False)
    grades: Mapped[str] = mapped_column(Text, nullable=False)
    draft_2027: Mapped[str | None] = mapped_column(Text, nullable=True)


class BviOlympiad(Base):
    __tablename__ = "bvi_olympiads"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # Уровень по перечню: 'I' | 'II' | 'III' | 'off' (нет в перечне — льгот не даёт)
    # или 'vsosh' — ВсОШ: не в перечне, льготы по отдельной статье закона.
    level: Mapped[str] = mapped_column(String(8), nullable=False)
    organizer: Mapped[str] = mapped_column(String(255), nullable=False)
    grades: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False)
    # Короткое имя для календаря и сообщений бота: «Физтех», «КФУ».
    short_title: Mapped[str | None] = mapped_column(String(64), nullable=True)
    site_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Страница с расписанием, за которой следит проверка дат; по умолчанию — site_url.
    dates_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    reg_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    chat_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Раздел с заданиями прошлых лет на сайте олимпиады: адрес и как он там назван.
    archive_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    archive_note: Mapped[str | None] = mapped_column(String(255), nullable=True)

    benefits: Mapped[list["BviBenefit"]] = relationship(
        back_populates="olympiad", cascade="all, delete-orphan"
    )
    stages: Mapped[list["OlympiadStage"]] = relationship(
        order_by="OlympiadStage.position", cascade="all, delete-orphan"
    )


class BviBenefit(Base):
    """Одна ячейка сводной таблицы: что даёт диплом этой олимпиады в этом вузе."""

    __tablename__ = "bvi_benefits"

    olympiad_id: Mapped[str] = mapped_column(
        ForeignKey("bvi_olympiads.id", ondelete="CASCADE"), primary_key=True
    )
    university_id: Mapped[str] = mapped_column(
        ForeignKey("bvi_universities.id", ondelete="CASCADE"), primary_key=True
    )
    # Код из легенды: 'bvi' | 'bvi_part' | 'score100' | 'none' | 'unknown'.
    winner: Mapped[str] = mapped_column(String(16), nullable=False)
    prize: Mapped[str] = mapped_column(String(16), nullable=False)

    olympiad: Mapped["BviOlympiad"] = relationship(back_populates="benefits")
