from pydantic import BaseModel, ConfigDict, Field

from app.schemas.active_effect import ActiveEffectRead
from app.schemas.adventurer import AdventurerRead


class RewardCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    cost: int = Field(ge=0)
    icon: str = Field(default="🎁", max_length=16)
    faction_id: int | None = None


class RewardUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    cost: int | None = Field(default=None, ge=0)
    icon: str | None = Field(default=None, max_length=16)
    faction_id: int | None = None


class RewardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    cost: int = Field(ge=0)
    description: str | None
    icon: str
    faction_id: int | None = None
    effective_cost: int | None = None


class RewardPurchaseResponse(BaseModel):
    reward: RewardRead
    adventurer: AdventurerRead
    message: str
    gold_spent: int
    active_effect: ActiveEffectRead | None = None


class RewardAiGenerateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    faction_id: int | None = None


class RewardAiGenerateResponse(BaseModel):
    description: str
    source: str = "gemini"
