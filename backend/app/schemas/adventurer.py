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
    xp_to_next_level: int = Field(
        description="Сколько XP осталось до следующего уровня",
    )
    created_at: datetime
    updated_at: datetime
