from pydantic import BaseModel, Field


class MentorBindRequest(BaseModel):
    invite_code: str = Field(min_length=4, max_length=12)


class MentorStudentRead(BaseModel):
    user_id: int
    adventurer_id: int
    display_name: str
    username: str
    invite_code: str


class MentorStudentsResponse(BaseModel):
    items: list[MentorStudentRead] = Field(default_factory=list)


class MentorBindResponse(BaseModel):
    student: MentorStudentRead
    message: str
