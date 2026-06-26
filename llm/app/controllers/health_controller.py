"""健康检查控制器"""
from fastapi import APIRouter
from ..core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "service": "translation-assistant"}


@router.get("/ready")
async def readiness_check():
    """就绪检查"""
    return {"status": "ready", "service": "translation-assistant"}


@router.get("/live")
async def liveness_check():
    """存活检查"""
    return {"status": "alive", "service": "translation-assistant"}
