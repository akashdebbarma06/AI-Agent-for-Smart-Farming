"""
KrishiMitra AI — Farming Prompt Builder.

Constructs the complete prompt string sent to IBM Granite, including:
  - A system persona that positions Granite as a conservative agricultural advisor
  - Retrieved context from the knowledge base (RAG chunks)
  - The farmer's question
  - Language instruction (Hindi/English)
  - Output structure instruction (4-part response format)

Why a dedicated module?
  Prompt engineering is its own concern. Keeping it separate from both the
  service layer and the AI service means prompts can be iterated and tested
  without touching either.
"""

from __future__ import annotations

from typing import List

from backend.app.models.chat import RetrievedDocument

# -------------------------------------------------------------------------
# System persona — defines who Granite is pretending to be
# -------------------------------------------------------------------------
_SYSTEM_PERSONA = """You are KrishiMitra, a knowledgeable and trusted agricultural advisor for small-scale Indian farmers.

Your role:
- Provide accurate, practical, and easy-to-understand farming advice
- Base your answers on the provided knowledge-base context
- Be conservative and cautious — farming decisions affect livelihoods
- Recommend that farmers verify chemical dosages, pesticide use, and disease treatments with their local Agriculture Extension Officer or Krishi Vigyan Kendra (KVK) before taking action

Rules you must always follow:
1. Answer primarily from the CONTEXT provided below
2. If the context does not contain enough information to answer confidently, say so clearly — do NOT fabricate information
3. For market prices or weather data: if labelled as SAMPLE/DEMO data, clearly state that to the farmer
4. Structure your response using the exact four-part format specified
5. Use simple language that a farmer with basic literacy can understand
6. Do not recommend specific brand names or proprietary products unless they appear in the context
"""

# -------------------------------------------------------------------------
# Output structure instruction
# -------------------------------------------------------------------------
_STRUCTURE_INSTRUCTION = """Format your response using EXACTLY this structure (use the labels as headers):

**Direct Answer:**
[Concise direct answer to the question]

**Recommended Action:**
[Specific, actionable steps the farmer should take]

**Important Caution:**
[Safety warnings, limitations, or when to seek expert advice — omit this section only if there is genuinely no caution needed]

**Sources Used:**
[Brief mention of which knowledge-base topics or documents informed this answer]
"""

# -------------------------------------------------------------------------
# Language instructions
# -------------------------------------------------------------------------
_LANGUAGE_INSTRUCTIONS = {
    "en": "Respond in clear, simple English.",
    "hi": (
        "अपना पूरा जवाब हिंदी में दें। "
        "सरल और आसान हिंदी का उपयोग करें जो एक किसान समझ सके। "
        "(Respond entirely in Hindi. Use simple Hindi that a farmer can understand.)"
    ),
}


def build_farming_prompt(
    question: str,
    retrieved_docs: List[RetrievedDocument],
    language: str = "en",
) -> str:
    """Assemble the complete prompt for IBM Granite.

    Args:
        question: The farmer's original question.
        retrieved_docs: Knowledge-base chunks retrieved by the RAG pipeline.
        language: Response language code ('en' or 'hi').

    Returns:
        A complete prompt string ready to be sent to GraniteService.generate().
    """
    # Build the context block from retrieved documents
    if retrieved_docs:
        context_parts = []
        for i, doc in enumerate(retrieved_docs, start=1):
            context_parts.append(
                f"[Source {i}: {doc.source}]\n{doc.content}"
            )
        context_block = "\n\n---\n\n".join(context_parts)
        context_section = f"CONTEXT FROM KNOWLEDGE BASE:\n\n{context_block}"
    else:
        # No relevant documents found — instruct Granite to be honest about this
        context_section = (
            "CONTEXT FROM KNOWLEDGE BASE:\n\n"
            "[No relevant information found in the knowledge base for this question.]"
        )

    language_instruction = _LANGUAGE_INSTRUCTIONS.get(
        language, _LANGUAGE_INSTRUCTIONS["en"]
    )

    prompt = f"""{_SYSTEM_PERSONA}

{_STRUCTURE_INSTRUCTION}

{language_instruction}

{context_section}

FARMER'S QUESTION: {question}

ANSWER:"""

    return prompt
