"""Metrics service - tracks translation statistics."""

from __future__ import annotations

import threading
import time

from ..core.logger import get_logger
from ..models.metrics import MetricsData, DirectionStats

logger = get_logger(__name__)


class MetricsService:
    """Thread-safe service for recording translation metrics."""

    def __init__(self):
        self._lock = threading.Lock()
        self._data = MetricsData()

    def record(self, direction: str, duration_ms: float) -> None:
        """Record a translation event."""
        with self._lock:
            self._data.total_translations += 1
            if direction not in self._data.directions:
                self._data.directions[direction] = DirectionStats()
            self._data.directions[direction].count += 1
            self._data.directions[direction].total_duration_ms += duration_ms

    def get_stats(self) -> dict:
        """Return a snapshot of current metrics."""
        with self._lock:
            data = self._data
            return {
                "total_translations": data.total_translations,
                "directions": {
                    name: {
                        "count": stats.count,
                        "avg_duration_ms": stats.avg_duration_ms,
                    }
                    for name, stats in data.directions.items()
                },
            }

    def reset(self) -> None:
        """Reset all metrics."""
        with self._lock:
            self._data = MetricsData()


_service_instance: MetricsService | None = None


def get_metrics_service() -> MetricsService:
    global _service_instance
    if _service_instance is None:
        _service_instance = MetricsService()
    return _service_instance
