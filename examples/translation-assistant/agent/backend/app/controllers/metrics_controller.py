from fastapi import APIRouter, Depends

from ..models import MetricsResponse
from ..services import get_metrics_service, MetricsService

router = APIRouter(prefix="/api", tags=["metrics"])


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics(
    service: MetricsService = Depends(get_metrics_service),
) -> MetricsResponse:
    return service.get_metrics()
