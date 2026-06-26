"""Metrics endpoint — /api/metrics."""

from __future__ import annotations

from fastapi import APIRouter
from ..services import get_metrics_service
from ..core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["metrics"])


@router.get("/metrics")
async def get_metrics():
    """Return translation statistics."""
    service = get_metrics_service()
    return service.get_stats()
