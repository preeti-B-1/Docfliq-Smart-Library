from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps.auth import require_admin
from app.models.user import User
from app.utils.storage import upload_image

router = APIRouter(prefix="/api/images", tags=["images"])

_ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
_MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10MB


@router.post("/upload")
async def upload_image_file(
    file: UploadFile = File(...),
    _admin: User = Depends(require_admin),
) -> dict[str, str]:
    content_type = file.content_type or ""
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PNG, JPEG, GIF, and WebP images are accepted.",
        )

    data = await file.read()
    if len(data) > _MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image exceeds the 10MB limit.",
        )

    url = await upload_image(data, content_type)
    if url is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image upload failed. Please try again.",
        )

    return {"url": url}
