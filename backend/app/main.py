import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.routes import ask_ai, auth, bookmarks, content, history, images, analytics
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
app.include_router(ask_ai.router)
app.include_router(images.router)
app.include_router(analytics.router)
app.include_router(bookmarks.router)
app.include_router(history.router)


@app.on_event("startup")
async def requeue_stuck_processing() -> None:
    import logging
    from app.api.deps.database import db_session_factory
    from app.models.content import Content
    from app.services import ai_service
    from app.utils.text_extractor import strip_to_plain_text

    logger = logging.getLogger(__name__)

    async def _process_sequentially(items: list[tuple[int, str]]) -> None:
        for content_id, plain_text in items:
            logger.info("Recovering stuck content %d", content_id)
            await ai_service.tag_content(content_id, plain_text)

    try:
        async with db_session_factory() as db:
            result = await db.execute(
                select(Content).where(Content.processing_status == "processing")
            )
            stuck = result.scalars().all()

            requeueable = []
            for item in stuck:
                plain = item.plain_text or strip_to_plain_text(item.body_text or "")
                if plain.strip():
                    item.processing_status = "pending"
                    requeueable.append((item.id, plain))
                else:
                    item.processing_status = "failed"
                    logger.warning("Content %d has no extractable text — marked failed", item.id)

            await db.commit()

        if requeueable:
            logger.info("Recovering %d stuck article(s) sequentially", len(requeueable))
            asyncio.create_task(_process_sequentially(requeueable))

    except Exception as e:
        logging.getLogger(__name__).warning("Startup requeue skipped: %s", e)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
