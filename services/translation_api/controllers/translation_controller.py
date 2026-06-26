"""FastAPI routes for translation and health endpoints."""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from ..models.schemas import (
    ErrorResponse,
    HealthStatus,
    StreamEvent,
    TranslateRequest,
    TranslateResponse,
)
from ..services import LLMService, TranslationService

LOGGER = logging.getLogger(__name__)

router = APIRouter()


# ── Health endpoints ──────────────────────────────────────────────────


@router.get("/health", response_model=HealthStatus, tags=["health"])
async def health():
    return HealthStatus(status="ok")


@router.get("/ready", response_model=HealthStatus, tags=["health"])
async def ready():
    return HealthStatus(status="ok")


@router.get("/live", response_model=HealthStatus, tags=["health"])
async def live():
    return HealthStatus(status="ok")


# ── Translation endpoints ──────────────────────────────────────────────


@router.post(
    "/api/translation/translate",
    response_model=TranslateResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    tags=["translation"],
)
async def translate(body: TranslateRequest, request: Request):
    svc = _get_translation_service(request)
    result = await svc.translate(body)
    return result


@router.post(
    "/api/translation/translate/stream",
    response_class=StreamingResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    tags=["translation"],
)
async def translate_stream(body: TranslateRequest, request: Request):
    svc = _get_translation_service(request)

    async def event_stream():
        index = 0
        try:
            async for token in svc.translate_stream(body):
                ev = StreamEvent(event="chunk", data=token, index=index)
                yield f"data: {json.dumps(ev.model_dump())}\n\n"
                index += 1
            ev = StreamEvent(event="done", data="", index=index)
            yield f"data: {json.dumps(ev.model_dump())}\n\n"
        except Exception as exc:
            LOGGER.error("Stream error: %s", exc)
            ev = StreamEvent(event="error", data=str(exc), index=index)
            yield f"data: {json.dumps(ev.model_dump())}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Internal helpers ──────────────────────────────────────────────────


def _get_translation_service(request: Request) -> TranslationService:
    """Retrieve the ``TranslationService`` from the application state."""
    svc: TranslationService | None = request.app.state.translation_service
    if svc is None:
        msg = "Translation service not initialized"
        raise RuntimeError(msg)
    return svc
