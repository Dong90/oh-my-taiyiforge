from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from ..models import TranslationRequest, TranslationResponse
from ..services import get_translation_service, TranslationService

router = APIRouter(prefix="/api/translation", tags=["translation"])


@router.post("/translate", response_model=TranslationResponse)
async def translate(
    request: TranslationRequest,
    service: TranslationService = Depends(get_translation_service),
) -> TranslationResponse:
    return await service.translate(request)


@router.post("/translate/stream")
async def translate_stream(
    request: TranslationRequest,
    service: TranslationService = Depends(get_translation_service),
):
    async def event_stream():
        async for chunk in service.translate_stream(request):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
