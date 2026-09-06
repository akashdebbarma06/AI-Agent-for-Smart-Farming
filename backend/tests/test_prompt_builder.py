"""
Tests for backend/app/ai/prompt_builder.py

Verifies that prompts are correctly structured and language-sensitive.
No IBM API calls are made in these tests.
"""

from __future__ import annotations

import pytest

from backend.app.ai.prompt_builder import build_farming_prompt
from backend.app.models.chat import RetrievedDocument


@pytest.fixture
def docs():
    return [
        RetrievedDocument(
            content="Rice needs 100-200 cm of rainfall.",
            source="crops/kharif_crops.md",
            score=0.91,
        )
    ]


def test_prompt_contains_question(docs):
    """The farmer's question must appear verbatim in the prompt."""
    question = "What is the water requirement of rice?"
    prompt = build_farming_prompt(question, docs, language="en")
    assert question in prompt


def test_prompt_contains_context(docs):
    """Retrieved document content must be embedded in the prompt."""
    prompt = build_farming_prompt("Any question?", docs, language="en")
    assert "Rice needs 100-200 cm of rainfall." in prompt


def test_prompt_contains_source_label(docs):
    """Source filename must appear in the prompt context block."""
    prompt = build_farming_prompt("Any question?", docs, language="en")
    assert "crops/kharif_crops.md" in prompt


def test_english_prompt_does_not_contain_hindi_instruction(docs):
    """English-language prompts must not include the Hindi response instruction."""
    prompt = build_farming_prompt("Any question?", docs, language="en")
    # Hindi instruction contains Devanagari script
    assert "हिंदी" not in prompt


def test_hindi_prompt_contains_hindi_instruction(docs):
    """Hindi-language prompts must include the Devanagari response instruction."""
    prompt = build_farming_prompt("Any question?", docs, language="hi")
    assert "हिंदी" in prompt


def test_prompt_without_docs_contains_no_context_notice():
    """When no documents are retrieved, the prompt must say so explicitly."""
    prompt = build_farming_prompt("Unrelated question", [], language="en")
    assert "No relevant information found" in prompt


def test_prompt_contains_four_part_structure_instruction(docs):
    """The prompt must instruct Granite to use the 4-part output structure."""
    prompt = build_farming_prompt("Any?", docs, language="en")
    assert "Direct Answer" in prompt
    assert "Recommended Action" in prompt
    assert "Important Caution" in prompt
    assert "Sources Used" in prompt


def test_prompt_contains_safety_persona(docs):
    """The system persona must reference agricultural officer consultation."""
    prompt = build_farming_prompt("Any?", docs, language="en")
    # Conservative advisory language must be present
    assert "Extension Officer" in prompt or "KVK" in prompt or "agricultural officer" in prompt.lower()
