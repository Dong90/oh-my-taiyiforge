from pydantic import BaseModel


class MetricsData(BaseModel):
    total_requests: int = 0
    total_tokens: int = 0
    success_count: int = 0
    error_count: int = 0
    avg_latency_ms: float = 0.0
