from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

# Neon требует SSL; asyncpg понимает ssl=True/False/SSLContext (или строки
# 'require'/'verify-full' и т.п. в новых версиях), а не libpq-параметр sslmode из URL.
engine = create_async_engine(
    settings.database_url, pool_pre_ping=True, connect_args={"ssl": "require"}
)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session
