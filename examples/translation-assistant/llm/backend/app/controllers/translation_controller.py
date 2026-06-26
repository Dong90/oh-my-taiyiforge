"""Translation API endpoints — sync and streaming (SSE)."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse

from ..models.request import TranslationRequest
from ..models.response import TranslationResponse
from ..services import get_translation_service
from ..core.exceptions import TranslationException
from ..core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/translation", tags=["translation"])


@router.post("/translate", response_model=TranslationResponse)
async def translate(request: TranslationRequest):
    """Non-streaming translation."""
    try:
        service = get_translation_service()
        result = await service.translate(request)
        return result
    except TranslationException as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )


@router.post("/translate/stream")
async def translate_stream(request: TranslationRequest):
    """Streaming translation via SSE."""

    async def event_stream():
        try:
            service = get_translation_service()
            async for chunk in service.translate_stream(request):
                yield f"data: {chunk}\n\n"
        except TranslationException as exc:
            yield f"data: {JSONResponse.__module__}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
