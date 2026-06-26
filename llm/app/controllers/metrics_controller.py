"""指标控制器"""
from fastapi import APIRouter, Depends
from ..services.metrics_service import MetricsService, get_metrics_service
from ..models.metrics import MetricsResponse
from ..core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("", response_model=MetricsResponse)
async def get_metrics(
    metrics_service: MetricsService = Depends(get_metrics_service),
) -> MetricsResponse:
    """获取所有产品指标"""
    metrics = metrics_service.get_metrics()
    return metrics
