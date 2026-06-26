"""指标服务"""
import time
from datetime import datetime
from threading import Lock
from ..models.metrics import TranslationMetrics, DirectionMetrics, MetricsResponse
from ..core.logger import get_logger

logger = get_logger(__name__)


class MetricsService:
    """指标服务 - 记录和查询翻译指标"""

    def __init__(self):
        self._lock = Lock()
        self._translations: list[dict] = []

    def record_translation(
        self,
        direction: str,
        text_length: int,
        response_time_ms: float,
        success: bool,
        model: str = "unknown",
        error_type: str | None = None,
    ):
        with self._lock:
            self._translations.append({
                "direction": direction,
                "text_length": text_length,
                "response_time_ms": response_time_ms,
                "success": success,
                "model": model,
                "error_type": error_type,
                "timestamp": time.time(),
            })

    def get_metrics(self) -> MetricsResponse:
        with self._lock:
            total = len(self._translations)
            if total == 0:
                return MetricsResponse(
                    translation=TranslationMetrics(),
                    direction=DirectionMetrics(),
                    updated_at=datetime.utcnow(),
                )

            recent = self._translations[-1000:]  # last 1000 records

            success_count = sum(1 for r in recent if r["success"])
            error_count = sum(1 for r in recent if not r["success"])
            total_chars = sum(r["text_length"] for r in recent)
            avg_time = sum(r["response_time_ms"] for r in recent) / total if total > 0 else 0

            direction_counts = DirectionMetrics()
            for r in recent:
                d = r["direction"]
                if hasattr(direction_counts, d):
                    setattr(direction_counts, d, getattr(direction_counts, d) + 1)

            return MetricsResponse(
                translation=TranslationMetrics(
                    total_translations=total,
                    total_characters=total_chars,
                    success_count=success_count,
                    error_count=error_count,
                    avg_response_time_ms=round(avg_time, 2),
                ),
                direction=direction_counts,
                performance={"avg_response_time_ms": round(avg_time, 2)},
                errors={},
                updated_at=datetime.utcnow(),
            )


_metrics_service: MetricsService | None = None


def get_metrics_service() -> MetricsService:
    global _metrics_service
    if _metrics_service is None:
        _metrics_service = MetricsService()
    return _metrics_service
