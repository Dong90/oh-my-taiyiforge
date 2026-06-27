"""Configuration hot-reload via watchfiles."""
from app.config.settings import settings as _settings

def reload_settings():
    """Reload settings from .env without restart."""
    from pydantic_settings import BaseSettings
    if hasattr(_settings, '__class__') and issubclass(_settings.__class__, BaseSettings):
        _settings.__init__()
    return _settings
