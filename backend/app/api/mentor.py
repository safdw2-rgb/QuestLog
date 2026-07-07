from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.crud import mentor as mentor_crud
from app.models.user import User
from app.schemas.mentor import (
    MentorBindRequest,
    MentorBindResponse,
    MentorStudentsResponse,
)

router = APIRouter(prefix="/mentor", tags=["mentor"])


@router.get("/students", response_model=MentorStudentsResponse)
async def list_my_students(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MentorStudentsResponse:
    students = await mentor_crud.list_students_for_mentor(
        db,
        mentor_user_id=user.id,
    )
    return MentorStudentsResponse(items=students)


@router.post("/bind", response_model=MentorBindResponse)
async def bind_student(
    data: MentorBindRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MentorBindResponse:
    try:
        student = await mentor_crud.bind_student_by_invite_code(
            db,
            mentor_user_id=user.id,
            invite_code=data.invite_code,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return MentorBindResponse(
        student=student,
        message=f"Ученик «{student.display_name}» привязан к вашему аккаунту наставника.",
    )


@router.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unbind_student(
    student_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await mentor_crud.unbind_student(
            db,
            mentor_user_id=user.id,
            student_user_id=student_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
