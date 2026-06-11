from pydantic import BaseModel, ConfigDict, Field

from app.schemas.adventurer import AdventurerRead


class RewardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    cost: int = Field(ge=0)
    description: str | None
    icon: str


class RewardPurchaseResponse(BaseModel):
    reward: RewardRead
    adventurer: AdventurerRead
    message: str
