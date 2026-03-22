import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.routes import auth, content, tags
from app.core.config import settings

app = FastAPI(title="DocFliq API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(content.router)
app.include_router(tags.router)


@app.on_event("startup")
async def requeue_stuck_processing() -> None:
    from app.api.deps.database import db_session_factory
    from app.models.content import Content
    from app.services import ai_service

    try:
        async with db_session_factory() as db:
            result = await db.execute(
                select(Content).where(Content.processing_status == "processing")
            )
            stuck = result.scalars().all()

        for item in stuck:
            asyncio.create_task(ai_service.tag_content(item.id, item.body_text))
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Startup requeue skipped: %s", e)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
