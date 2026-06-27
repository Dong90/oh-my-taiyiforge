import asyncio
import time

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.api.deps import MetricsCollector, get_metrics, get_timestamp, get_translation_service
from app.core.exceptions import TranslationError, ValidationError
from app.llm.service import TranslationService
from app.models.metrics import MetricsData
from app.models.request import TranslationRequest
from app.models.response import TranslationResponse

router = APIRouter()


@router.post("/translate", response_model=TranslationResponse)
async def translate(
    body: TranslationRequest,
    service: TranslationService = Depends(get_translation_service),
    metrics_collector: MetricsCollector = Depends(get_metrics),
):
    start = time.monotonic()
    try:
        result = await service.translate(
            text=body.text,
            source_lang=body.source_lang,
            target_lang=body.target_lang,
            role=body.role,
        )
        latency = (time.monotonic() - start) * 1000
        metrics_collector.record_request(tokens=result.tokens_used, success=True, latency_ms=latency)
        return TranslationResponse(
            translated_text=result.text,
            source_lang=result.source_lang,
            target_lang=result.target_lang,
            tokens_used=result.tokens_used,
        )
    except TranslationError:
        raise
    except Exception as e:
        latency = (time.monotonic() - start) * 1000
        metrics_collector.record_request(tokens=0, success=False, latency_ms=latency)
        raise TranslationError(str(e)) from e


@router.get("/translate")
async def translate_stream(
    text: str = Query(..., min_length=1, max_length=5000),
    source_lang: str = Query("auto"),
    target_lang: str = Query(...),
    role: str = Query("general"),
    service: TranslationService = Depends(get_translation_service),
    metrics_collector: MetricsCollector = Depends(get_metrics),
):
    if not text.strip():
        raise ValidationError("text must not be empty")

    async def event_stream():
        total_tokens = 0
        start = time.monotonic()
        try:
            async for chunk in service.translate_stream(text, source_lang, target_lang, role):
                total_tokens += 1
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
            latency = (time.monotonic() - start) * 1000
            metrics_collector.record_request(tokens=total_tokens, success=True, latency_ms=latency)
        except Exception:
            latency = (time.monotonic() - start) * 1000
            metrics_collector.record_request(tokens=total_tokens, success=False, latency_ms=latency)
            yield "data: [ERROR]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/health")
async def health():
    return {"status": "ok", "timestamp": get_timestamp()}


@router.get("/metrics", response_model=MetricsData)
async def metrics(
    metrics_collector: MetricsCollector = Depends(get_metrics),
):
    return metrics_collector.snapshot()
