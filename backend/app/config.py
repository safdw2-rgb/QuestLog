from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+asyncpg://questlog:questlog@localhost:5432/questlog"
    app_title: str = "QuestLog API"
    app_version: str = "0.1.0"


settings = Settings()
