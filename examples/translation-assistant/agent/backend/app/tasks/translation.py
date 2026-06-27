"""Async translation tasks."""
from .celery_app import celery_app

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def translate_async(self, direction: str, text: str):
    """Async translation via Celery."""
    try:
        # In production, this would call the actual translation service
        return {"direction": direction, "text": text, "status": "queued"}
    except Exception as exc:
        raise self.retry(exc=exc)
