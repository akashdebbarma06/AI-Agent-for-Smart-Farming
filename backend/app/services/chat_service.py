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


from backend.app.services.tools import get_weather, get_mandi_prices

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
        """Process a farmer's question and return a structured answer."""
        session_id = request.session_id or str(uuid.uuid4())
        logger.info(
            "ChatService processing question (session=%s, lang=%s): %.80s...",
            session_id,
            request.language,
            request.question,
        )

        # Agentic Routing via Granite
        router_prompt = (
            "You are a routing agent for an agricultural system. "
            "Categorize the following user question into EXACTLY ONE of these three categories: "
            "WEATHER, MANDI, or RAG.\n"
            "If the user asks about temperature, rain, or weather forecasts, return WEATHER.\n"
            "If the user asks about crop prices, rates, or mandi markets, return MANDI.\n"
            "For everything else (diseases, fertilizers, general farming), return RAG.\n\n"
            f"Question: {request.question}\n"
            "Category:"
        )
        
        try:
            intent = self._granite.generate(router_prompt, max_new_tokens=10).strip().upper()
        except Exception as e:
            logger.error("Router failed: %s", e)
            intent = "RAG"

        if "WEATHER" in intent:
            answer_text = get_weather()
            return ChatResponse(answer=answer_text, sources=[], language=request.language, session_id=session_id)
            
        if "MANDI" in intent:
            answer_text = get_mandi_prices()
            return ChatResponse(answer=answer_text, sources=[], language=request.language, session_id=session_id)

        # Step 1: Retrieve relevant knowledge-base chunks via RAG
        retrieved_docs = self._rag.retrieve(request.question, top_k=5)

        if not retrieved_docs:
            logger.warning("No relevant documents retrieved. Enforcing strict RAG grounding.")
            answer_text = (
                "**Verified information unavailable.**\n\n"
                "I could not find relevant, verified information in the official KrishiMitra knowledge base to answer your question. "
                "To ensure your crop's safety, please consult your local Krishi Vigyan Kendra (KVK) or agriculture extension officer."
            )
            return ChatResponse(answer=answer_text, sources=[], language=request.language, session_id=session_id)

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
            logger.error("Granite generation failed for session %s: %s", session_id, exc)
            answer_text = "I'm sorry, I was unable to generate an answer at this time due to a technical issue. Please try again later."

        return ChatResponse(
            answer=answer_text,
            sources=retrieved_docs,
            language=request.language,
            session_id=session_id,
        )
