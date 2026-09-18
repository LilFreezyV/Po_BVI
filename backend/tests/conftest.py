import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.database import engine
from app.main import app


@pytest_asyncio.fixture(autouse=True)
async def _dispose_engine_pool():
    # pytest-asyncio даёт каждому тесту свой event loop, а пул engine глобальный:
    # соединения из прошлого теста остаются привязаны к уже закрытому loop, и
    # следующий тест падает с «Event loop is closed» / 'NoneType' ... 'send'.
    # Закрываем пул в том же loop, где он использовался.
    yield
    await engine.dispose()


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def unique_email() -> str:
    return f"test-{uuid.uuid4().hex[:12]}@example.com"
