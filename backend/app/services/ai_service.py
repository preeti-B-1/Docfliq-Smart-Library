import json
import logging
import time
from typing import Any

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.ai_provider_log import AIProviderLog
from app.models.content import Content
from app.models.content_tag import ContentTag
from app.models.tag import Tag
from app.utils.specialties import validate_and_normalize_specialty

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are a medical content tagging assistant. Analyze the provided medical text and return a JSON object with exactly these fields:

{
  "title": "<concise article title, max 15 words>",
  "description": "<one sentence subtitle or abstract, max 30 words>",
  "specialty": ["<1-2 specialties from the allowed list only>"],
  "topics": ["<3-4 freeform topic tags>"],
  "difficulty": "<Beginner|Intermediate|Advanced>",
  "key_terms": ["<5-10 medical key terms>"],
  "content_type": "<Article|Case Study|Guideline|Review|Editorial|Other>",
  "summary": "<exactly 3 sentences summarizing the content>"
}

Allowed specialties (pick 1-2 only from this exact list):
Cardiology, Neurology, Oncology, Pediatrics, Orthopedics, Dermatology, Gastroenterology, Pulmonology, Endocrinology, Nephrology, Psychiatry, Radiology, Emergency Medicine, Obstetrics & Gynecology, Infectious Disease, Surgery (General), Ophthalmology, Anesthesiology, Hematology, Rheumatology, Urology, ENT / Otolaryngology, Internal Medicine, Family Medicine, Critical Care / ICU Medicine

Return ONLY valid JSON. No explanation, no markdown, no code fences."""

_MAX_TEXT_CHARS = 12000
_MAX_EMBEDDING_CHARS = 30000


async def tag_content(content_id: int, plain_text: str) -> None:
    from app.api.deps.database import db_session_factory

    async with db_session_factory() as db:
        await _process_tagging(content_id, plain_text, db)


async def process_file_content(content_id: int, filename: str, data: bytes) -> None:
    from app.api.deps.database import db_session_factory
    from app.utils.text_extractor import convert_to_html

    async with db_session_factory() as db:
        result = await db.execute(select(Content).where(Content.id == content_id))
        content = result.scalar_one_or_none()
        if content is None:
            return

        content.processing_status = "processing"
        await db.commit()

        try:
            html, plain_text = await convert_to_html(filename, data)
            content.body_text = html
            content.plain_text = plain_text

            ai_result = await _call_ai_with_fallback(plain_text, content.description, content_id, db)
            await _save_tags(content, ai_result, db)

            embedding = await generate_embedding(content.title + " " + plain_text)
            content.embedding = embedding
            key_terms_str = " ".join(ai_result.get("key_terms", []))
            content.search_vector = func.to_tsvector(
                "english",
                content.title + " " + (content.ai_summary or "") + (" " + key_terms_str if key_terms_str else ""),
            )
            content.processing_status = "completed"
        except Exception:
            logger.exception("File processing failed for content %d", content_id)
            content.processing_status = "failed"

        await db.commit()


async def _process_tagging(content_id: int, plain_text: str, db: AsyncSession) -> None:
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if content is None:
        return

    content.processing_status = "processing"
    content.plain_text = plain_text
    await db.commit()

    try:
        ai_result = await _call_ai_with_fallback(plain_text, content.description, content_id, db)
        await _save_tags(content, ai_result, db)

        embedding = await generate_embedding(content.title + " " + plain_text)
        content.embedding = embedding
        key_terms_str = " ".join(ai_result.get("key_terms", []))
        content.search_vector = func.to_tsvector(
            "english",
            content.title + " " + (content.ai_summary or "") + (" " + key_terms_str if key_terms_str else ""),
        )
        content.processing_status = "completed"
    except Exception:
        logger.exception("AI processing failed for content %d", content_id)
        content.processing_status = "failed"

    await db.commit()


async def _call_ai_with_fallback(
    plain_text: str,
    description: str | None,
    content_id: int,
    db: AsyncSession,
) -> dict[str, Any]:
    start = time.monotonic()
    try:
        result = await _call_claude(plain_text, description)
        duration_ms = int((time.monotonic() - start) * 1000)
        await _log_provider(content_id, "claude", success=True, fallback=False, error=None, duration_ms=duration_ms, db=db)
        return result
    except Exception as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        error_msg = str(exc)
        logger.warning("Claude failed for content %d (%dms): %s — trying GPT fallback", content_id, duration_ms, error_msg)
        await _log_provider(content_id, "claude", success=False, fallback=False, error=error_msg, duration_ms=duration_ms, db=db)

    start = time.monotonic()
    try:
        result = await _call_gpt(plain_text, description)
        duration_ms = int((time.monotonic() - start) * 1000)
        await _log_provider(content_id, "gpt-4o-mini", success=True, fallback=True, error=None, duration_ms=duration_ms, db=db)
        return result
    except Exception as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        error_msg = str(exc)
        logger.error("GPT fallback also failed for content %d (%dms): %s", content_id, duration_ms, error_msg)
        await _log_provider(content_id, "gpt-4o-mini", success=False, fallback=True, error=error_msg, duration_ms=duration_ms, db=db)
        raise


async def _log_provider(
    content_id: int,
    provider: str,
    success: bool,
    fallback: bool,
    error: str | None,
    duration_ms: int,
    db: AsyncSession,
    source: str = "tagging",
) -> None:
    try:
        db.add(AIProviderLog(
            content_id=content_id,
            provider=provider,
            source=source,
            success=success,
            used_as_fallback=fallback,
            error_message=error,
            duration_ms=duration_ms,
        ))
        await db.flush()
    except Exception:
        logger.exception("Failed to write AI provider log for content %d", content_id)


async def generate_embedding(text: str) -> list[float]:
    truncated = text[:_MAX_EMBEDDING_CHARS]
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=truncated,
    )
    return response.data[0].embedding


async def _call_claude(body_text: str, description: str | None = None) -> dict[str, Any]:
    truncated = body_text[:_MAX_TEXT_CHARS]

    if not truncated.strip():
        raise ValueError("No readable text could be extracted from this file.")

    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"Admin description: {description}\n\nArticle content:\n{truncated}" if description else truncated

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Tag this medical content:\n\n{prompt}"}],
    )

    raw = message.content[0].text.strip()

    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:].strip()

    if not raw:
        raise ValueError("Claude returned an empty response.")

    return json.loads(raw)


async def _call_gpt(body_text: str, description: str | None = None) -> dict[str, Any]:
    truncated = body_text[:_MAX_TEXT_CHARS]

    if not truncated.strip():
        raise ValueError("No readable text could be extracted from this file.")

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    prompt = f"Admin description: {description}\n\nArticle content:\n{truncated}" if description else truncated

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=1024,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": f"Tag this medical content:\n\n{prompt}"},
        ],
    )

    raw = response.choices[0].message.content or ""
    raw = raw.strip()

    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:].strip()

    if not raw:
        raise ValueError("GPT returned an empty response.")

    return json.loads(raw)


async def _save_tags(content: Content, ai_result: dict[str, Any], db: AsyncSession) -> None:
    tags_to_link: list[Tag] = []

    for raw_specialty in ai_result.get("specialty", [])[:2]:
        canonical = validate_and_normalize_specialty(str(raw_specialty))
        if canonical:
            tag = await _upsert_tag(canonical, "specialty", is_fixed=True, db=db)
            tags_to_link.append(tag)

    raw_difficulty = str(ai_result.get("difficulty", "")).strip()
    if raw_difficulty in ("Beginner", "Intermediate", "Advanced"):
        tag = await _upsert_tag(raw_difficulty, "difficulty", is_fixed=True, db=db)
        tags_to_link.append(tag)

    for topic in ai_result.get("topics", [])[:4]:
        cleaned = str(topic).strip()
        if cleaned:
            tag = await _upsert_tag(cleaned, "topic", is_fixed=False, db=db)
            tags_to_link.append(tag)

    for term in ai_result.get("key_terms", [])[:10]:
        cleaned = str(term).strip()
        if cleaned:
            tag = await _upsert_tag(cleaned, "key_term", is_fixed=False, db=db)
            tags_to_link.append(tag)

    raw_type = str(ai_result.get("content_type", "")).strip()
    if raw_type:
        tag = await _upsert_tag(raw_type, "content_type", is_fixed=False, db=db)
        tags_to_link.append(tag)

    existing_result = await db.execute(
        select(ContentTag.tag_id).where(ContentTag.content_id == content.id)
    )
    existing_tag_ids = {row[0] for row in existing_result.all()}

    for tag in tags_to_link:
        if tag.id not in existing_tag_ids:
            db.add(ContentTag(content_id=content.id, tag_id=tag.id))
            existing_tag_ids.add(tag.id)

    summary = str(ai_result.get("summary", "")).strip()
    if summary:
        content.ai_summary = summary

    ai_title = str(ai_result.get("title", "")).strip()
    if ai_title:
        content.title = ai_title

    ai_description = str(ai_result.get("description", "")).strip()
    if ai_description:
        content.description = ai_description

    await db.flush()


async def _upsert_tag(name: str, tag_type: str, is_fixed: bool, db: AsyncSession) -> Tag:
    result = await db.execute(
        select(Tag).where(
            func.lower(Tag.name) == name.lower(),
            Tag.type == tag_type,
        )
    )
    tag = result.scalar_one_or_none()

    if tag is None:
        tag = Tag(name=name, type=tag_type, is_fixed=is_fixed)
        db.add(tag)
        await db.flush()

    return tag
