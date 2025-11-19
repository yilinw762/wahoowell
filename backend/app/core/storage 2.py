"""Google Cloud Storage helpers for community uploads."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable, Sequence
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from google.api_core import exceptions
from google.cloud import storage

from app import schemas

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/avif",
    "image/gif",
}

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"}

MAX_IMAGES_PER_POST = int(os.getenv("COMMUNITY_IMAGES_MAX", "4"))
MAX_IMAGE_SIZE_MB = int(os.getenv("COMMUNITY_IMAGE_MAX_MB", "5"))
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024
AUTO_MAKE_PUBLIC = os.getenv("GCS_AUTO_MAKE_PUBLIC", "true").lower() in {"1", "true", "yes"}

SIGNED_URL_MODE = os.getenv("GCS_SIGNED_URL_MODE", "auto").strip().lower()
SIGNED_URL_TTL_SECONDS = int(os.getenv("GCS_SIGNED_URL_TTL", "86400"))

_cached_client: storage.Client | None = None
_public_acl_failed = False


def _get_bucket_name() -> str:
    bucket_name = os.getenv("GCS_BUCKET_NAME")
    if not bucket_name:
        raise HTTPException(
            status_code=500,
            detail="GCS_BUCKET_NAME is not configured on the server.",
        )
    return bucket_name


def _get_client() -> storage.Client:
    global _cached_client
    if _cached_client is None:
        _cached_client = storage.Client()
    return _cached_client


def _get_bucket() -> storage.bucket.Bucket:
    client = _get_client()
    return client.bucket(_get_bucket_name())


def _build_object_name(filename: str | None) -> str:
    folder = os.getenv("GCS_IMAGE_FOLDER", "community-images").strip("/")
    stamp = datetime.utcnow().strftime("%Y/%m")
    ext = (Path(filename or "").suffix or "").lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".jpg"
    return f"{folder}/posts/{stamp}/{uuid4().hex}{ext}"


def _build_public_url(object_name: str) -> str:
    override = os.getenv("GCS_PUBLIC_BASE_URL")
    if override:
        return f"{override.rstrip('/')}/{object_name}"
    bucket = _get_bucket_name()
    return f"https://storage.googleapis.com/{bucket}/{object_name}"


def _should_use_signed_urls() -> bool:
    if SIGNED_URL_MODE in {"always", "true", "1"}:
        return True
    if SIGNED_URL_MODE in {"never", "false", "0"}:
        return False
    return (not AUTO_MAKE_PUBLIC) or _public_acl_failed


def _generate_signed_url(object_name: str) -> str:
    expiration = timedelta(seconds=max(60, SIGNED_URL_TTL_SECONDS))
    blob = _get_bucket().blob(object_name)
    return blob.generate_signed_url(
        version="v4",
        method="GET",
        expiration=expiration,
        response_disposition="inline",
    )


def get_media_url(object_name: str, *, fallback_url: str | None = None) -> str:
    if not object_name:
        return fallback_url or ""

    if _should_use_signed_urls():
        try:
            return _generate_signed_url(object_name)
        except Exception as exc:  # pragma: no cover - network
            logger.warning("Failed to generate signed URL for %s: %s", object_name, exc)

    return fallback_url or _build_public_url(object_name)


async def upload_post_images(files: Sequence[UploadFile]) -> list[schemas.CommunityPostImageCreate]:
    global _public_acl_failed
    usable = [file for file in files if file and file.filename]
    if not usable:
        return []

    if len(usable) > MAX_IMAGES_PER_POST:
        raise HTTPException(
            status_code=400,
            detail=f"You can upload up to {MAX_IMAGES_PER_POST} images per post.",
        )

    bucket = _get_bucket()
    uploads: list[schemas.CommunityPostImageCreate] = []

    for upload in usable:
        contents = await upload.read()
        if not contents:
            continue

        if len(contents) > MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Each image must be under {MAX_IMAGE_SIZE_MB}MB.",
            )

        content_type = upload.content_type or "image/jpeg"
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Only PNG, JPG, WEBP, AVIF, or GIF images are supported.",
            )

        object_name = _build_object_name(upload.filename)
        blob = bucket.blob(object_name)
        blob.cache_control = "public, max-age=31536000, immutable"
        blob.upload_from_string(contents, content_type=content_type)

        if AUTO_MAKE_PUBLIC and not _should_use_signed_urls():
            global _public_acl_failed
            try:
                blob.make_public()
            except exceptions.GoogleAPIError as exc:
                _public_acl_failed = True
                logger.info(
                    "Unable to update ACL for %s. Falling back to signed URLs for new images. Error: %s",
                    blob.name,
                    exc,
                )

        public_url = get_media_url(object_name)

        uploads.append(
            schemas.CommunityPostImageCreate(
                file_name=upload.filename or Path(object_name).name,
                storage_path=object_name,
                public_url=public_url,
                content_type=content_type,
                size_bytes=len(contents),
            )
        )

    return uploads


def delete_post_images(paths: Iterable[str]) -> None:
    bucket = None
    for path in paths:
        if not path:
            continue
        if bucket is None:
            try:
                bucket = _get_bucket()
            except HTTPException as exc:  # pragma: no cover - configuration error
                logger.warning("Skipping image deletion: %s", exc.detail)
                return
        blob = bucket.blob(path)
        try:
            blob.delete()
        except Exception as exc:  # pragma: no cover - deletion best-effort
            logger.warning("Failed to delete blob %s: %s", path, exc)
