from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
    )

    database_url: str = "postgresql+asyncpg://questlog:questlog@localhost:5432/questlog"
    app_title: str = "QuestLog API"
    app_version: str = "0.1.0"

    openrouter_api_key: str | None = None
    openrouter_model: str = "meta-llama/llama-3.2-3b-instruct:free"
    ai_quest_allow_fallback: bool = True

    obsidian_vault_path: str | None = None

    # Часовой пояс полуночного сброса ежедневных квестов (IANA, напр. Europe/Kyiv)
    daily_reset_timezone: str = "Europe/Kyiv"

    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None

    @field_validator("telegram_bot_token", "telegram_chat_id", mode="before")
    @classmethod
    def normalize_optional_str(cls, value: object) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return str(value)

    @field_validator("openrouter_api_key", mode="before")
    @classmethod
    def normalize_api_key(cls, value: object) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return str(value)


settings = Settings()
