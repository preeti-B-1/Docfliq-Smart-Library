import logging
import uuid
from collections.abc import Sequence

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_BUCKET = "article-images"
_ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
_EXT_MAP = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
}


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "apikey": settings.SUPABASE_SERVICE_KEY,
    }


def public_url(path: str) -> str:
    return f"{settings.SUPABASE_URL}/storage/v1/object/public/{_BUCKET}/{path}"


def upload_image_sync(data: bytes, content_type: str) -> str | None:
    """Upload image bytes to Supabase Storage (sync). Returns public URL or None on failure."""
    if content_type not in _ALLOWED_MIME_TYPES:
        logger.warning("Rejected image upload with content_type=%s", content_type)
        return None

    ext = _EXT_MAP[content_type]
    path = f"{uuid.uuid4()}.{ext}"
    upload_url = f"{settings.SUPABASE_URL}/storage/v1/object/{_BUCKET}/{path}"

    with httpx.Client() as client:
        response = client.post(
            upload_url,
            content=data,
            headers={**_headers(), "Content-Type": content_type},
            timeout=30,
        )

    if response.status_code not in (200, 201):
        logger.warning(
            "Supabase Storage upload failed: status=%s body=%s",
            response.status_code,
            response.text,
        )
        return None

    return public_url(path)


async def upload_image(data: bytes, content_type: str) -> str | None:
    """Upload image bytes to Supabase Storage (async). Returns public URL or None on failure."""
    import asyncio
    return await asyncio.to_thread(upload_image_sync, data, content_type)


async def delete_images(urls: Sequence[str]) -> None:
    """Delete images from Supabase Storage given their public URLs."""
    prefix = f"{settings.SUPABASE_URL}/storage/v1/object/public/{_BUCKET}/"
    paths = [url[len(prefix):] for url in urls if url.startswith(prefix)]

    if not paths:
        return

    delete_url = f"{settings.SUPABASE_URL}/storage/v1/object/{_BUCKET}"
    async with httpx.AsyncClient() as client:
        response = await client.request(
            "DELETE",
            delete_url,
            headers={**_headers(), "Content-Type": "application/json"},
            json={"prefixes": paths},
            timeout=30,
        )

    if response.status_code not in (200, 204):
        logger.warning(
            "Supabase Storage delete failed: status=%s body=%s",
            response.status_code,
            response.text,
        )
