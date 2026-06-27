"""Rate limiting middleware using slowapi."""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

def setup_ratelimit(app):
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    return limiter
