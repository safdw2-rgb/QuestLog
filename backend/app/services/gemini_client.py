"""Единый HTTP-клиент Google Gemini REST API."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

GEMINI_API_VERSION = "v1beta"
GEMINI_API_BASE = f"https://generativelanguage.googleapis.com/{GEMINI_API_VERSION}"
DEFAULT_MODEL = "gemini-2.5-flash"
FALLBACK_MODELS = (
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-pro",
)
GEMINI_REQUEST_TIMEOUT = 30.0
GEMINI_TIMEOUT_RETRIES = 1


class GeminiGenerationError(RuntimeError):
    """Gemini недоступен или вернул неожиданный ответ."""


def resolve_model_candidates() -> list[str]:
    configured = (settings.gemini_model or "").strip()
    candidates: list[str] = []
    if configured:
        candidates.append(configured)
    for model in FALLBACK_MODELS:
        if model not in candidates:
            candidates.append(model)
    return candidates


def get_gemini_api_url(model: str | None = None) -> str:
    model_name = model or settings.gemini_model or DEFAULT_MODEL
    return f"{GEMINI_API_BASE}/models/{model_name}:generateContent"


def _extract_text(data: dict[str, Any]) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        raise ValueError(f"Gemini returned no candidates: {data}")

    candidate = candidates[0]
    finish_reason = candidate.get("finishReason")
    if finish_reason in {"SAFETY", "RECITATION"}:
        raise ValueError(f"Gemini blocked response: {finish_reason}")

    try:
        # Gemini 2.5 Flash splits the response into multiple parts (thinking tokens
        # land in separate parts without a "text" key). Join all text parts so we
        # never silently drop the continuation of a long response.
        parts = candidate["content"]["parts"]
        text = "".join(part.get("text", "") for part in parts)
        if not text:
            raise ValueError(f"All parts have empty text: {data}")
        logger.debug(
            "Gemini _extract_text: parts=%d total_chars=%d",
            len(parts),
            len(text),
        )
        return text
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError(f"Unexpected Gemini response shape: {data}") from exc


def parse_json_content(content: str) -> dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return json.loads(cleaned)


async def _post_generate(
    client: httpx.AsyncClient,
    *,
    url: str,
    payload: dict[str, Any],
    model: str,
) -> httpx.Response:
    last_timeout: httpx.TimeoutException | None = None

    for attempt in range(GEMINI_TIMEOUT_RETRIES + 1):
        try:
            return await client.post(
                url,
                params={"key": settings.gemini_api_key},
                json=payload,
            )
        except httpx.TimeoutException as exc:
            last_timeout = exc
            if attempt < GEMINI_TIMEOUT_RETRIES:
                logger.warning(
                    "Gemini timeout model=%s attempt=%s, retrying once",
                    model,
                    attempt + 1,
                )
                continue
            raise

    if last_timeout is not None:
        raise last_timeout
    raise GeminiGenerationError("Gemini request failed")


async def generate_content(
    *,
    system_instruction: str,
    user_prompt: str,
    temperature: float = 0.85,
    max_output_tokens: int | None = None,
    json_schema: dict[str, Any] | None = None,
    thinking_budget: int = 0,
    timeout: float = GEMINI_REQUEST_TIMEOUT,
) -> str:
    """Call Gemini and return the **full** generated text.

    Parameters
    ----------
    thinking_budget:
        Maximum tokens the model may spend on "thinking" (chain-of-thought).
        Set to 0 (default) to disable thinking entirely — all tokens go to
        the visible output.  Increase for tasks that benefit from reasoning.
        Gemini 2.5 Flash enables thinking by default and charges thinking
        tokens against maxOutputTokens, which silently truncates creative
        outputs when the budget is too small.
    """
    if not settings.gemini_api_key:
        raise GeminiGenerationError("GEMINI_API_KEY is not set")

    generation_config: dict[str, Any] = {
        "temperature": temperature,
        # Disable (or cap) thinking so ALL tokens go to visible output.
        # Without this, Gemini 2.5 Flash consumes most of maxOutputTokens
        # for internal reasoning and returns only a tiny text fragment.
        "thinkingConfig": {"thinkingBudget": thinking_budget},
    }
    if max_output_tokens is not None:
        generation_config["maxOutputTokens"] = max_output_tokens
    if json_schema is not None:
        generation_config["responseMimeType"] = "application/json"
        generation_config["responseSchema"] = json_schema

    payload: dict[str, Any] = {
        "systemInstruction": {
            "parts": [{"text": system_instruction}],
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_prompt}],
            },
        ],
        "generationConfig": generation_config,
    }

    last_error: Exception | None = None
    models = resolve_model_candidates()

    async with httpx.AsyncClient(timeout=timeout) as client:
        for model in models:
            url = get_gemini_api_url(model)
            logger.info("Gemini request model=%s json_mode=%s", model, json_schema is not None)
            try:
                response = await _post_generate(
                    client,
                    url=url,
                    payload=payload,
                    model=model,
                )
            except httpx.TimeoutException as exc:
                logger.error("Gemini timeout model=%s after retry: %s", model, exc)
                last_error = exc
                continue
            except httpx.RequestError as exc:
                logger.error("Gemini network error model=%s: %s", model, exc)
                last_error = exc
                continue

            if response.status_code == 404:
                logger.warning(
                    "Gemini model %s not found (404), trying fallback. body=%s",
                    model,
                    response.text[:300],
                )
                last_error = httpx.HTTPStatusError(
                    "model not found",
                    request=response.request,
                    response=response,
                )
                continue

            if response.is_error:
                logger.error(
                    "Gemini HTTP %s model=%s body=%s",
                    response.status_code,
                    model,
                    response.text[:2000],
                )
                response.raise_for_status()

            data = response.json()
            # Full text — joining ALL parts (Gemini 2.5 may split into several).
            full_text = _extract_text(data)
            # Separate preview variable — only used for the log line, never returned.
            preview = full_text[:200]
            logger.info(
                "Gemini success model=%s chars=%d preview=%s",
                model,
                len(full_text),
                preview,
            )
            return full_text  # always the complete, unsliced text

    if last_error is not None:
        raise last_error
    raise GeminiGenerationError("No Gemini models available")


async def generate_json(
    *,
    system_instruction: str,
    user_prompt: str,
    json_schema: dict[str, Any],
    temperature: float = 0.85,
) -> dict[str, Any]:
    content = await generate_content(
        system_instruction=system_instruction,
        user_prompt=user_prompt,
        temperature=temperature,
        json_schema=json_schema,
    )
    try:
        return parse_json_content(content)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Model returned invalid JSON: {content[:500]}") from exc
