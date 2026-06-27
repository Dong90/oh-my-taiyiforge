"""Redis cache with TTL support."""
import json
import functools
import hashlib
from typing import Optional
import redis.asyncio as aioredis
from app.config.settings import settings

REDIS_URL = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
DEFAULT_TTL = 3600

_cache_client: Optional[aioredis.Redis] = None

async def get_cache() -> aioredis.Redis:
    global _cache_client
    if _cache_client is None:
        _cache_client = aioredis.from_url(REDIS_URL, decode_responses=True)
    return _cache_client

def cached(ttl: int = DEFAULT_TTL):
    """Decorator: cache function result by (func_name + args_hash)."""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            cache = await get_cache()
            key = f"{func.__name__}:{hashlib.md5(str(args).encode()).hexdigest()}"
            cached_result = await cache.get(key)
            if cached_result:
                return json.loads(cached_result)
            result = await func(*args, **kwargs)
            await cache.setex(key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator
