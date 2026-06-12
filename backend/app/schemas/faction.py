from pydantic import BaseModel, ConfigDict, Field


class FactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    icon: str | None
    color: str | None
    description: str | None
    reputation_points: int


class FactionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    icon: str | None = Field(default=None, max_length=32)
    color: str | None = Field(default=None, max_length=7)
    description: str | None = None


class FactionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    icon: str | None = Field(default=None, max_length=32)
    color: str | None = Field(default=None, max_length=7)
    description: str | None = None
