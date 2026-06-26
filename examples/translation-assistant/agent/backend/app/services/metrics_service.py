import time
from datetime import datetime, timezone

from ..core import get_logger
from ..models import MetricsResponse

logger = get_logger("metrics-service")


class MetricsService:
    def __init__(self):
        self._total = 0
        self._total_time_ms = 0.0
        self._last_at = ""
        self._direction_counts: dict[str, int] = {}

    def record(self, direction: str, duration_ms: float):
        self._total += 1
        self._total_time_ms += duration_ms
        self._last_at = datetime.now(timezone.utc).isoformat()
        self._direction_counts[direction] = self._direction_counts.get(direction, 0) + 1

    def get_metrics(self) -> MetricsResponse:
        avg = self._total_time_ms / self._total if self._total > 0 else 0.0
        return MetricsResponse(
            total_translations=self._total,
            avg_response_time_ms=round(avg, 1),
            last_translation_at=self._last_at,
            direction_counts=self._direction_counts,
        )


_metrics_service: MetricsService | None = None


def get_metrics_service() -> MetricsService:
    global _metrics_service
    if _metrics_service is None:
        _metrics_service = MetricsService()
    return _metrics_service
