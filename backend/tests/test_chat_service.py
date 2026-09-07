"""
Tests for backend/app/services/chat_service.py

Verifies that ChatService correctly orchestrates RAG + Granite.
All IBM API calls are mocked — no real credentials needed.
"""

from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest

from backend.app.models.chat import ChatRequest, ChatResponse, RetrievedDocument
from backend.app.services.chat_service import ChatService


@pytest.fixture
def mock_rag_pipeline(sample_retrieved_documents):
    """RAGPipeline mock that returns pre-built RetrievedDocument fixtures."""
    mock = MagicMock()
    mock.retrieve.return_value = sample_retrieved_documents
    return mock


@pytest.fixture
def mock_granite_service():
    """GraniteService mock that returns a canned structured response."""
    mock = MagicMock()
    mock.generate.return_value = (
        "**Direct Answer:**\nWheat grows well in loamy soil.\n\n"
        "**Recommended Action:**\nApply fertiliser in split doses.\n\n"
        "**Important Caution:**\nConsult your local KVK for variety selection.\n\n"
        "**Sources Used:**\nrabi_crops.md, npk_guide.md"
    )
    return mock


@pytest.fixture
def chat_service(mock_rag_pipeline, mock_granite_service):
    """ChatService backed by mocked dependencies."""
    return ChatService(
        rag_pipeline=mock_rag_pipeline,
        granite_service=mock_granite_service,
    )


def test_answer_returns_chat_response(chat_service):
    """answer() must return a ChatResponse instance."""
    request = ChatRequest(question="What crop suits black soil?", language="en")
    response = chat_service.answer(request)
    assert isinstance(response, ChatResponse)


def test_answer_calls_rag_retrieve(chat_service, mock_rag_pipeline):
    """answer() must call rag_pipeline.retrieve() with the farmer's question."""
    question = "How do I control tomato pests?"
    request = ChatRequest(question=question, language="en")
    chat_service.answer(request)
    mock_rag_pipeline.retrieve.assert_called_once_with(question, top_k=5)


def test_answer_calls_granite_generate(chat_service, mock_granite_service):
    """answer() must call granite_service.generate() with a non-empty prompt."""
    request = ChatRequest(question="What fertiliser for wheat?", language="en")
    chat_service.answer(request)
    assert mock_granite_service.generate.call_count >= 1
    # The last call should be the RAG prompt
    prompt_arg = mock_granite_service.generate.call_args_list[-1][0][0]
    assert len(prompt_arg) > 50, "Prompt passed to Granite is too short"


def test_answer_includes_sources_in_response(chat_service, sample_retrieved_documents):
    """ChatResponse.sources must contain the documents returned by the RAG pipeline."""
    request = ChatRequest(question="Tell me about wheat soil needs.", language="en")
    response = chat_service.answer(request)
    assert len(response.sources) == len(sample_retrieved_documents)
    assert response.sources[0].source == sample_retrieved_documents[0].source


def test_answer_echoes_language(chat_service):
    """ChatResponse.language must match the language requested."""
    for lang in ("en", "hi"):
        request = ChatRequest(question="What is good soil?", language=lang)
        response = chat_service.answer(request)
        assert response.language == lang


def test_answer_assigns_session_id_when_not_provided(chat_service):
    """ChatResponse.session_id must be a valid UUID when request has none."""
    request = ChatRequest(question="Tell me about paddy?")
    response = chat_service.answer(request)
    # Must be parseable as UUID
    parsed = uuid.UUID(response.session_id)
    assert str(parsed) == response.session_id


def test_answer_echoes_provided_session_id(chat_service):
    """ChatResponse.session_id must match the session_id provided in the request."""
    sid = str(uuid.uuid4())
    request = ChatRequest(question="Any question?", session_id=sid)
    response = chat_service.answer(request)
    assert response.session_id == sid


def test_answer_graceful_fallback_on_granite_error(mock_rag_pipeline):
    """When Granite raises GraniteServiceError, answer() must return a graceful fallback."""
    from backend.app.ai.granite_service import GraniteServiceError

    failing_granite = MagicMock()
    failing_granite.generate.side_effect = GraniteServiceError("API timeout")

    service = ChatService(rag_pipeline=mock_rag_pipeline, granite_service=failing_granite)
    request = ChatRequest(question="What crop for red soil?")
    response = service.answer(request)

    assert isinstance(response, ChatResponse)
    # Fallback message should mention trying again or contacting KVK
    assert "try again" in response.answer.lower() or "KVK" in response.answer
