"""
KrishiMitra AI — Chat request and response models.

These Pydantic models define the contract between the frontend, the API layer,
and all internal services. Every layer uses these types — no raw dicts are passed
between module boundaries.
"""

from __future__ import annotations

import uuid
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):
    """Incoming farmer question from the frontend."""

    question: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="The farmer's agricultural question.",
        examples=["What crop is best for black soil in the Kharif season?"],
    )
    language: Literal["en", "hi"] = Field(
        default="en",
        description="Response language. 'en' = English, 'hi' = Hindi.",
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Optional client-generated session identifier for conversation tracking.",
    )

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, v: str) -> str:
        """Reject questions that are whitespace-only after stripping."""
        if not v.strip():
            raise ValueError("Question must not be blank or whitespace only.")
        return v.strip()


class RetrievedDocument(BaseModel):
    """A single document chunk retrieved from the vector store during RAG."""

    content: str = Field(description="The text content of the retrieved chunk.")
    source: str = Field(description="Filename or path of the source document.")
    score: float = Field(
        description="Cosine similarity score (0.0–1.0). Higher = more relevant.",
        ge=0.0,
        le=1.0,
    )


class ChatResponse(BaseModel):
    """Structured response returned to the frontend after RAG + Granite generation."""

    answer: str = Field(
        description=(
            "Full response from IBM Granite, structured as: "
            "Direct Answer → Recommended Action → Important Caution (if any) → Sources Used."
        )
    )
    sources: List[RetrievedDocument] = Field(
        default_factory=list,
        description="Knowledge-base chunks that were used to construct the answer.",
    )
    language: str = Field(
        description="Language code of the response ('en' or 'hi').",
    )
    session_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Session identifier echoed back to the client.",
    )
