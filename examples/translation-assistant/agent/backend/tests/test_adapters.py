import pytest
from app.adapters.base import LLMAdapter
from app.adapters.openai_adapter import OpenAIAdapter


class TestLLMAdapter:
    def test_base_adapter_has_complete_method(self):
        assert hasattr(LLMAdapter, "complete")

    def test_base_adapter_is_abstract(self):
        with pytest.raises(TypeError):
            LLMAdapter()  # cannot instantiate abstract class


class TestOpenAIAdapter:
    @pytest.fixture
    def adapter(self):
        return OpenAIAdapter(
            api_key="test-key",
            base_url="https://api.example.com/v1",
            model="gpt-test",
        )

    def test_adapter_creates_client(self, adapter):
        assert adapter.model == "gpt-test"
        assert adapter.client.api_key == "test-key"

    def test_adapter_has_stream_complete(self, adapter):
        assert hasattr(adapter, "stream_complete")
