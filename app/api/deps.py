from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from app.config.settings import settings
from app.llm.service import TranslationService


class MetricsCollector:
    def __init__(self):
        self.total_requests = 0
        self.total_tokens = 0
        self.success_count = 0
        self.error_count = 0
        self.total_latency_ms = 0.0

    def record_request(self, tokens: int, success: bool, latency_ms: float):
        self.total_requests += 1
        self.total_tokens += tokens
        if success:
            self.success_count += 1
        else:
            self.error_count += 1
        self.total_latency_ms += latency_ms

    def snapshot(self):
        from app.models.metrics import MetricsData
        avg = self.total_latency_ms / max(self.total_requests, 1)
        return MetricsData(
            total_requests=self.total_requests,
            total_tokens=self.total_tokens,
            success_count=self.success_count,
            error_count=self.error_count,
            avg_latency_ms=round(avg, 2),
        )


metrics = MetricsCollector()


def get_translation_service() -> TranslationService:
    return TranslationService()


def get_metrics() -> MetricsCollector:
    return metrics


def get_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()
