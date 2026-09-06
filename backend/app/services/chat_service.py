"""
KrishiMitra AI — Chat Service.

Orchestrates a complete chat request:
  1. Retrieve relevant knowledge-base chunks (RAG)
  2. Build a structured prompt (with context + language instruction)
  3. Call IBM Granite for response generation
  4. Assemble and return a typed ChatResponse

This service layer sits between the API route (HTTP concern) and the
AI/RAG services (model concerns), keeping each layer focused.
"""

from __future__ import annotations

import uuid

from backend.app.ai.granite_service import GraniteService, GraniteServiceError
from backend.app.ai.prompt_builder import build_farming_prompt
from backend.app.models.chat import ChatRequest, ChatResponse
from backend.app.rag.pipeline import RAGPipeline
from backend.app.utils.logger import get_logger

logger = get_logger(__name__)


class ChatService:
    """Handles a single turn of the KrishiMitra chat conversation."""

    def __init__(
        self,
        rag_pipeline: RAGPipeline,
        granite_service: GraniteService,
    ) -> None:
        self._rag = rag_pipeline
        self._granite = granite_service

    def answer(self, request: ChatRequest) -> ChatResponse:
        """Process a farmer's question and return a structured answer.

        Args:
            request: Validated :class:`ChatRequest` from the API layer.

        Returns:
            :class:`ChatResponse` with answer text, sources, and session id.
        """
        session_id = request.session_id or str(uuid.uuid4())
        logger.info(
            "ChatService processing question (session=%s, lang=%s): %.80s...",
            session_id,
            request.language,
            request.question,
        )

        # Step 1: Retrieve relevant knowledge-base chunks via RAG
        retrieved_docs = self._rag.retrieve(request.question, top_k=5)

        if not retrieved_docs:
            logger.warning(
                "No relevant documents retrieved for question (session=%s). "
                "Answer will be based on Granite's general knowledge only.",
                session_id,
            )

        # Step 2: Construct the full prompt with retrieved context
        prompt = build_farming_prompt(
            question=request.question,
            retrieved_docs=retrieved_docs,
            language=request.language,
        )

        # Step 3: Generate the response using IBM Granite
        try:
            answer_text = self._granite.generate(prompt)
        except GraniteServiceError as exc:
            logger.error(
                "Granite generation failed for session %s: %s",
                session_id,
                exc,
            )
            # Return a graceful fallback — never expose raw exception to the farmer
            answer_text = (
                "**Direct Answer:**\n"
                "I'm sorry, I was unable to generate an answer at this time due to a technical issue.\n\n"
                "**Recommended Action:**\n"
                "Please try again in a few moments, or contact your local Krishi Vigyan Kendra (KVK) for immediate assistance.\n\n"
                "**Important Caution:**\n"
                "Do not delay urgent agricultural decisions — consult a local expert if this service is unavailable."
            )

        return ChatResponse(
            answer=answer_text,
            sources=retrieved_docs,
            language=request.language,
            session_id=session_id,
        )
