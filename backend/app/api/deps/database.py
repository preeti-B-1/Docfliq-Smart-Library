from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import create_engine, create_session_factory

_engine = create_engine(settings.DATABASE_URL)
_session_factory = create_session_factory(_engine)

# Exposed for use in background tasks that need their own session
db_session_factory = _session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with _session_factory() as session:
        yield session
