from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

SOLVED = "solved"
QUESTION = "question"


class TaskAttempt(Base):
    """Отметка пользователя у задачи темы каталога: solved или question. Нет строки — нет отметки."""

    __tablename__ = "task_attempts"
    __table_args__ = (UniqueConstraint("user_id", "task_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ProblemAttempt(Base):
    """То же для задачи из задачника (lesson_problems). Без FK: сид пересоздаёт lesson_problems
    с теми же id, каскад стёр бы отметки."""

    __tablename__ = "problem_attempts"
    __table_args__ = (UniqueConstraint("user_id", "problem_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    problem_id: Mapped[str] = mapped_column(String(96), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
