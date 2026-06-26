"""Tests for middleware."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.exceptions import ValidationError
from app.middleware.cors import setup_cors
from app.middleware.error_handler import app_error_handler, generic_error_handler


class TestCORS:
    def test_cors_headers(self):
        app = FastAPI()

        @app.get("/test")
        async def test():
            return {"ok": True}

        setup_cors(app)
        client = TestClient(app)
        resp = client.get("/test", headers={"Origin": "http://example.com"})
        assert resp.status_code == 200
        assert resp.headers.get("access-control-allow-origin") == "*"


class TestErrorHandler:
    def test_app_error_handler(self):
        app = FastAPI()
        app.add_exception_handler(ValidationError, app_error_handler)

        @app.get("/fail")
        async def fail():
            raise ValidationError("nope")

        client = TestClient(app)
        resp = client.get("/fail")
        assert resp.status_code == 400
        data = resp.json()
        assert data["error"] == "VALIDATION_ERROR"

    def test_generic_error_handler(self):
        """ServerErrorMiddleware returns 500 for unhandled exceptions."""
        app = FastAPI()

        @app.get("/crash")
        async def crash():
            raise RuntimeError("boom")

        client = TestClient(app, raise_server_exceptions=False)
        resp = client.get("/crash")
        assert resp.status_code == 500
