"""Health check endpoints — /health, /ready, /live."""

from __future__ import annotations

from fastapi import APIRouter
from ..config import settings
from ..core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    """Health check — service is running."""
    return {"status": "healthy", "version": settings.app_version}


@router.get("/ready")
async def ready():
    """Readiness check — service is ready to serve traffic."""
    return {"status": "ready", "version": settings.app_version}


@router.get("/live")
async def live():
    """Liveness check — service is alive."""
    return {"status": "alive", "version": settings.app_version}
