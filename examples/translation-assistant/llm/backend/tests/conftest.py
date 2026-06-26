"""pytest configuration — fixtures for all tests."""

import pytest
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture(scope="session", autouse=True)
def test_env():
    """Set test environment."""
    os.environ.setdefault("OPENAI_API_KEY", "test-key-placeholder")
    os.environ.setdefault("LOG_LEVEL", "ERROR")
    os.environ.setdefault("LOG_FORMAT", "text")
    os.environ["ENVIRONMENT"] = "test"
    yield


@pytest.fixture
def sample_product_text() -> str:
    return "我们需要一个智能推荐功能，提升用户停留时长"


@pytest.fixture
def sample_dev_text() -> str:
    return "我们优化了数据库查询，QPS提升了30%"
