import json
import logging
import time

from anthropic import AsyncAnthropic
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.database import get_db
from app.core.config import settings
from app.models.content import Content
from app.models.user import User
from app.utils.text_extractor import strip_to_plain_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/content", tags=["ask-ai"])

_MAX_USER_MESSAGES = 10
_MAX_BODY_CHARS = 12000


class ConversationMessage(BaseModel):
    role: str
    content: str


class AskAIRequest(BaseModel):
    question: str
    conversation_history: list[ConversationMessage] = []


@router.post("/{content_id}/ask")
async def ask_ai(
    content_id: int,
    body: AskAIRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()

    if content is None or content.status != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found.")

    user_message_count = sum(1 for m in body.conversation_history if m.role == "user")
    if user_message_count >= _MAX_USER_MESSAGES:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"You've reached the {_MAX_USER_MESSAGES}-message limit for this session. Reload the page to start a new session.",
        )

    readable_text = content.plain_text or strip_to_plain_text(content.body_text)
    truncated_body = readable_text[:_MAX_BODY_CHARS]
    system_prompt = (
        f"You are a medical content assistant. Answer the user's questions based ONLY on the "
        f"article text provided below. If the question cannot be answered from the article, say "
        f"so clearly. Do not use outside knowledge.\n\n"
        f"Article: {content.title}\n\n"
        f"{truncated_body}"
    )

    messages = [{"role": m.role, "content": m.content} for m in body.conversation_history]
    messages.append({"role": "user", "content": body.question})

    async def generate():
        from app.api.deps.database import db_session_factory
        from app.models.ai_provider_log import AIProviderLog

        started = False
        start = time.monotonic()
        try:
            client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            async with client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    started = True
                    yield f"data: {json.dumps({'text': text})}\n\n"
        except Exception as exc:
            duration_ms = int((time.monotonic() - start) * 1000)
            error_msg = str(exc)
            logger.warning("Claude stream failed for content %d — falling back to GPT-4o", content_id)
            async with db_session_factory() as log_db:
                try:
                    log_db.add(AIProviderLog(
                        content_id=content_id,
                        provider="claude",
                        source="ask_ai",
                        success=False,
                        used_as_fallback=False,
                        error_message=error_msg,
                        duration_ms=duration_ms,
                    ))
                    await log_db.commit()
                except Exception:
                    logger.exception("Failed to log Claude ask_ai failure for content %d", content_id)

            if not started:
                gpt_start = time.monotonic()
                try:
                    gpt_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                    gpt_messages = [{"role": "system", "content": system_prompt}] + messages
                    gpt_stream = await gpt_client.chat.completions.create(
                        model="gpt-4o",
                        max_tokens=1024,
                        messages=gpt_messages,
                        stream=True,
                    )
                    async for chunk in gpt_stream:
                        text = chunk.choices[0].delta.content
                        if text:
                            yield f"data: {json.dumps({'text': text})}\n\n"
                    gpt_duration_ms = int((time.monotonic() - gpt_start) * 1000)
                    async with db_session_factory() as log_db:
                        try:
                            log_db.add(AIProviderLog(
                                content_id=content_id,
                                provider="gpt-4o",
                                source="ask_ai",
                                success=True,
                                used_as_fallback=True,
                                error_message=None,
                                duration_ms=gpt_duration_ms,
                            ))
                            await log_db.commit()
                        except Exception:
                            logger.exception("Failed to log GPT ask_ai fallback for content %d", content_id)
                except Exception:
                    logger.exception("GPT-4o fallback also failed for content %d", content_id)
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
