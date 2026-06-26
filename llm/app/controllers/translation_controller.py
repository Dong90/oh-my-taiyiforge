"""翻译控制器 - API端点"""
import time
import json
from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse
from ..models.request import TranslationRequest
from ..models.response import TranslationResponse
from ..services.translation_service import TranslationService
from ..services.llm_service import LLMService
from ..adapters.openai_adapter import OpenAIAdapter
from ..core.logger import get_logger
from ..services.metrics_service import get_metrics_service

logger = get_logger(__name__)

router = APIRouter(prefix="/api/translation", tags=["translation"])


def get_llm_adapter(request: Request) -> OpenAIAdapter:
    """获取LLM适配器实例（依赖注入）"""
    from ..config import settings
    api_key = settings.openai_api_key
    base_url = settings.openai_api_base_url
    model = settings.openai_model

    if not api_key:
        from ..core.exceptions import ConfigurationException
        raise ConfigurationException(
            "OpenAI API key is required",
            error_code="MISSING_API_KEY",
            status_code=500,
        )
    return OpenAIAdapter(api_key=api_key, base_url=base_url, model=model)


def get_llm_service(adapter: OpenAIAdapter = Depends(get_llm_adapter)) -> LLMService:
    return LLMService(adapter)


def get_translation_service(llm_service: LLMService = Depends(get_llm_service)) -> TranslationService:
    return TranslationService(llm_service)


@router.post("/translate", response_model=TranslationResponse)
async def translate(
    request: TranslationRequest,
    fastapi_request: Request,
    service: TranslationService = Depends(get_translation_service),
):
    """非流式翻译接口"""
    start_time = time.time()
    success = True
    try:
        translated_text = await service.translate(request.text, request.direction)
    except Exception:
        success = False
        raise

    duration_ms = (time.time() - start_time) * 1000
    try:
        metrics_service = get_metrics_service()
        metrics_service.record_translation(
            direction=request.direction,
            text_length=len(request.text),
            response_time_ms=duration_ms,
            success=success,
        )
    except Exception as e:
        logger.warning(f"Failed to record metrics: {e}")

    return TranslationResponse(
        translated_text=translated_text,
        direction=request.direction,
        original_text=request.text,
    )


@router.post("/translate/stream")
async def translate_stream(
    request: TranslationRequest,
    fastapi_request: Request,
    service: TranslationService = Depends(get_translation_service),
):
    """流式翻译接口（SSE）"""
    start_time = time.time()

    async def generate():
        success = True
        try:
            async for chunk in service.translate_stream(request.text, request.direction):
                yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
        except Exception:
            success = False
            raise
        finally:
            yield "data: [DONE]\n\n"
            duration_ms = (time.time() - start_time) * 1000
            try:
                ms = get_metrics_service()
                ms.record_translation(
                    direction=request.direction,
                    text_length=len(request.text),
                    response_time_ms=duration_ms,
                    success=success,
                )
            except Exception as e:
                logger.warning(f"Failed to record metrics: {e}")

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
