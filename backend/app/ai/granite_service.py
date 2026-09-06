"""
KrishiMitra AI — IBM Granite Language Model Service.

THIS IS THE ONLY MODULE that imports from ibm_watsonx_ai for text generation.
All response generation goes through GraniteService.generate() — never bypass it.

IBM SDK reference:
  from ibm_watsonx_ai import Credentials
  from ibm_watsonx_ai.foundation_models import ModelInference

Why isolate IBM here?
  - Keeps the IBM integration surface minimal and auditable
  - Makes the service swappable in tests (mock this one class)
  - Avoids accidental credential leakage in other modules
"""

from __future__ import annotations

from backend.app.config.settings import settings
from backend.app.utils.logger import get_logger

logger = get_logger(__name__)


class GraniteServiceError(Exception):
    """Raised when IBM Granite fails to generate a response.

    Callers should catch this and return a user-friendly error message
    rather than crashing the API request.
    """


class GraniteService:
    """Wraps IBM Granite text generation via the watsonx.ai REST API.

    Instantiate once at application startup and reuse for every request.
    The underlying SDK manages connection pooling internally.
    """

    def __init__(self) -> None:
        # ----------------------------------------------------------------
        # IBM INTEGRATION POINT — import and initialise watsonx.ai SDK
        # ----------------------------------------------------------------
        try:
            from ibm_watsonx_ai import Credentials  # type: ignore[import-untyped]
            from ibm_watsonx_ai.foundation_models import ModelInference  # type: ignore[import-untyped]
        except ImportError as exc:
            raise ImportError(
                "ibm-watsonx-ai is not installed. Run: pip install ibm-watsonx-ai"
            ) from exc

        # ----------------------------------------------------------------
        # IBM INTEGRATION POINT — credentials come exclusively from env vars
        # ----------------------------------------------------------------
        credentials = Credentials(
            url=settings.IBM_WATSONX_URL,
            api_key=settings.watsonx_api_key_value,
        )

        # ----------------------------------------------------------------
        # IBM INTEGRATION POINT — ModelInference object for Granite
        # model_id and project_id come from settings (env vars)
        # ----------------------------------------------------------------
        self._model: "ModelInference" = ModelInference(
            model_id=settings.IBM_GRANITE_MODEL_ID,
            credentials=credentials,
            project_id=settings.IBM_WATSONX_PROJECT_ID,
        )

        logger.info(
            "GraniteService initialised with model: %s",
            settings.IBM_GRANITE_MODEL_ID,
        )

    def generate(self, prompt: str, max_new_tokens: int = 800) -> str:
        """Send *prompt* to IBM Granite and return the generated text.

        Args:
            prompt: The complete prompt string (system + context + question).
            max_new_tokens: Maximum number of tokens to generate in the response.
                            Keep below the model's context window limit.

        Returns:
            The model's generated text as a plain string.

        Raises:
            GraniteServiceError: If the API call fails for any reason.
                Includes the original error message for debugging.
        """
        if not prompt.strip():
            raise GraniteServiceError("Prompt must not be empty.")

        try:
            # ----------------------------------------------------------------
            # IBM INTEGRATION POINT — actual API call to IBM Granite
            # chat() uses the /ml/v1/text/chat endpoint (preferred for granite-4).
            # Falls back gracefully to generate_text for older models.
            # ----------------------------------------------------------------
            chat_response = self._model.chat(
                messages=[{"role": "user", "content": prompt}],
                params={
                    "max_tokens": max_new_tokens,
                    # Temperature 0.3: factual and consistent, not robotic
                    "temperature": 0.3,
                    # Penalise repetition — Granite sometimes loops on agricultural lists
                    "repetition_penalty": 1.1,
                },
            )

            # Extract the text from the chat response structure
            response = (
                chat_response
                .get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )

            if not response:
                raise GraniteServiceError(
                    "IBM Granite returned an empty response."
                )

            logger.debug(
                "Granite response generated (%d chars)", len(response)
            )
            return response

        except GraniteServiceError:
            raise  # Re-raise our own typed errors without wrapping

        except Exception as exc:  # noqa: BLE001
            logger.error("IBM Granite API call failed: %s", exc)
            raise GraniteServiceError(
                f"IBM Granite generation failed: {exc}"
            ) from exc
