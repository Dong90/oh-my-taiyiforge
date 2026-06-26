"""Metrics data model."""

from __future__ import annotations

from pydantic import BaseModel


class DirectionStats(BaseModel):
    count: int = 0
    total_duration_ms: float = 0.0

    @property
    def avg_duration_ms(self) -> float:
        return round(self.total_duration_ms / self.count, 1) if self.count else 0.0


class MetricsData(BaseModel):
    total_translations: int = 0
    directions: dict[str, DirectionStats] = {}
