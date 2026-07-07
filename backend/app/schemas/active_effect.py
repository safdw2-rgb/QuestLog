from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ActiveEffectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    icon: str
    effect_type: str
    expires_at: datetime
    created_at: datetime


class ActiveEffectListResponse(BaseModel):
    items: list[ActiveEffectRead] = Field(default_factory=list)
