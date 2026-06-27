"""API v1 translation endpoints."""
from fastapi import APIRouter
from app.models.translation import TranslationRequest, TranslationResponse
from app.services.translation_service import TranslationService
from fastapi import Depends

router = APIRouter(prefix="/api/v1/translation", tags=["translation"])

@router.post("/translate", response_model=TranslationResponse)
async def translate(request: TranslationRequest, service: TranslationService = Depends()):
    return await service.translate(request.direction, request.text)

@router.post("/translate/stream")
async def translate_stream(request: TranslationRequest, service: TranslationService = Depends()):
    from fastapi.responses import StreamingResponse
    return StreamingResponse(service.translate_stream(request.direction, request.text), media_type="text/event-stream")
