"""CORS fine-grained configuration."""
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings

def setup_cors(app):
    origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', ["*"])
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
