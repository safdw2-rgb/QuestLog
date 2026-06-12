from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

from app.models.enums import QuestDifficulty, QuestStatus, QuestType
from app.schemas.adventurer import AdventurerRead


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
OptionalReminderTime = Annotated[datetime | None, BeforeValidator(validate_deadline)]


def validate_optional_float(value: object) -> float | None:
    if value is None or value == "":
        return None
    return float(value)  # type: ignore[arg-type]


OptionalCoordinate = Annotated[float | None, BeforeValidator(validate_optional_float)]


class QuestCreate(BaseModel):
    adventurer_id: int
    title: str = Field(max_length=200)
    description: str | None = Field(default=None)
    quest_type: QuestType = QuestType.SIDE
    difficulty: QuestDifficulty = QuestDifficulty.NORMAL
    xp_reward: int = Field(default=0, ge=0)
    gold_reward: int = Field(default=0, ge=0)
    deadline: OptionalDeadline = None
    reminder_time: OptionalReminderTime = None
    latitude: OptionalCoordinate = None
    longitude: OptionalCoordinate = None
    faction_id: OptionalForeignKey = None
    location_id: OptionalForeignKey = None
    parent_quest_id: OptionalForeignKey = None


class QuestStatusUpdate(BaseModel):
    status: QuestStatus
    fail_reason: str | None = None


class QuestDeadlineUpdate(BaseModel):
    deadline: OptionalDeadline = None
    reminder_time: OptionalReminderTime = None


class QuestUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = None
    faction_id: OptionalForeignKey = None
    deadline: OptionalDeadline = None
    reminder_time: OptionalReminderTime = None
    latitude: OptionalCoordinate = None
    longitude: OptionalCoordinate = None


class QuestAiGenerateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    latitude: OptionalCoordinate = None
    longitude: OptionalCoordinate = None


class QuestAiGenerateResponse(BaseModel):
    description: str
    quest_type: QuestType
    difficulty: QuestDifficulty
    xp_reward: int = Field(ge=0)
    gold_reward: int = Field(ge=0)
    source: str = Field(description="gemini или fallback")


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
    reminder_time: datetime | None
    latitude: float | None
    longitude: float | None
    bargained: bool
    started_at: datetime
    completed_at: datetime | None
    failed_at: datetime | None
    fail_reason: str | None
    sort_order: int
    created_at: datetime
    updated_at: datetime


class QuestDeadlineUpdateResponse(BaseModel):
    quest: QuestRead
    adventurer: AdventurerRead
    gold_spent: int = Field(default=0, ge=0)


class QuestUpdateResponse(BaseModel):
    quest: QuestRead
    adventurer: AdventurerRead
    gold_spent: int = Field(default=0, ge=0)


class QuestBargainResponse(BaseModel):
    quest: QuestRead
    adventurer: AdventurerRead
    roll: int = Field(ge=1, le=20)
    outcome: str = Field(description="fail, success или critical")
    message: str
    gold_spent: int = Field(default=10, ge=0)
