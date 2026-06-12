from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AdventurerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    experience_points: int
    gold: int
    level: int
    lore: str | None = None
    xp_to_next_level: int = Field(
        description="Сколько XP осталось до следующего уровня",
    )
    created_at: datetime
    updated_at: datetime


class AdventurerUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=128)
    username: str | None = Field(default=None, max_length=64)
    lore: str | None = Field(default=None, max_length=1000)
