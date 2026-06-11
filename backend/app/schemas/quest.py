from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

from app.models.enums import QuestDifficulty, QuestStatus, QuestType


def validate_foreign_keys(value: object) -> int | None:
    """Swagger подставляет 0 для необязательных FK — трактуем как отсутствие значения."""
    if value is None or value == "" or value == 0:
        return None
    return int(value)  # type: ignore[arg-type]


def validate_deadline(value: object) -> datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        # Swagger/OpenAPI часто шлёт ISO 8601 с суффиксом Z
        normalized = value.replace("Z", "+00:00") if value.endswith("Z") else value
        return datetime.fromisoformat(normalized)
    raise TypeError("deadline must be a datetime or ISO 8601 string")


OptionalForeignKey = Annotated[int | None, BeforeValidator(validate_foreign_keys)]
OptionalDeadline = Annotated[datetime | None, BeforeValidator(validate_deadline)]


class QuestCreate(BaseModel):
    adventurer_id: int
    title: str = Field(max_length=200)
    description: str | None = Field(default=None)
    quest_type: QuestType = QuestType.SIDE
    difficulty: QuestDifficulty = QuestDifficulty.NORMAL
    xp_reward: int = Field(default=0, ge=0)
    gold_reward: int = Field(default=0, ge=0)
    deadline: OptionalDeadline = None
    faction_id: OptionalForeignKey = None
    location_id: OptionalForeignKey = None
    parent_quest_id: OptionalForeignKey = None


class QuestStatusUpdate(BaseModel):
    status: QuestStatus
    fail_reason: str | None = None


class QuestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    adventurer_id: int
    faction_id: int | None
    location_id: int | None
    parent_quest_id: int | None
    title: str
    description: str | None
    quest_type: QuestType
    status: QuestStatus
    difficulty: QuestDifficulty
    xp_reward: int
    gold_reward: int
    xp_earned: int
    gold_earned: int
    deadline: datetime | None
    started_at: datetime
    completed_at: datetime | None
    failed_at: datetime | None
    fail_reason: str | None
    sort_order: int
    created_at: datetime
    updated_at: datetime
