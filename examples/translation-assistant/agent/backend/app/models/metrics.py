from pydantic import BaseModel


class MetricsResponse(BaseModel):
    total_translations: int = 0
    avg_response_time_ms: float = 0.0
    last_translation_at: str = ""
    direction_counts: dict = {}
