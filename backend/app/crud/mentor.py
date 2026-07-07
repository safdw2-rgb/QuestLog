import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.adventurer import get_adventurer_by_user_id
from app.models.adventurer import Adventurer
from app.models.mentor_student import MentorStudent
from app.models.user import User
from app.schemas.mentor import MentorStudentRead


def generate_invite_code() -> str:
    return secrets.token_urlsafe(6).upper().replace("-", "X")[:10]


async def _ensure_unique_invite_code(db: AsyncSession) -> str:
    while True:
        code = generate_invite_code()
        result = await db.execute(select(User.id).where(User.invite_code == code))
        if result.scalar_one_or_none() is None:
            return code


async def is_mentor_of_student(
    db: AsyncSession,
    *,
    mentor_user_id: int,
    student_user_id: int,
) -> bool:
    stmt = select(MentorStudent.id).where(
        MentorStudent.mentor_user_id == mentor_user_id,
        MentorStudent.student_user_id == student_user_id,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def bind_student_by_invite_code(
    db: AsyncSession,
    *,
    mentor_user_id: int,
    invite_code: str,
) -> MentorStudentRead:
    code = invite_code.strip().upper()
    if not code:
        raise ValueError("invite_code is required")

    result = await db.execute(select(User).where(User.invite_code == code))
    student_user = result.scalar_one_or_none()
    if student_user is None:
        raise ValueError("Invalid invite code")

    if student_user.id == mentor_user_id:
        raise ValueError("Cannot mentor yourself")

    existing = await db.execute(
        select(MentorStudent).where(
            MentorStudent.mentor_user_id == mentor_user_id,
            MentorStudent.student_user_id == student_user.id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ValueError("Student already linked to this mentor")

    link = MentorStudent(
        mentor_user_id=mentor_user_id,
        student_user_id=student_user.id,
    )
    db.add(link)
    await db.commit()

    student_adventurer = await get_adventurer_by_user_id(db, student_user.id)
    if student_adventurer is None:
        raise ValueError("Student adventurer profile not found")

    return MentorStudentRead(
        user_id=student_user.id,
        adventurer_id=student_adventurer.id,
        display_name=student_adventurer.display_name,
        username=student_adventurer.username,
        invite_code=student_user.invite_code,
    )


async def list_students_for_mentor(
    db: AsyncSession,
    *,
    mentor_user_id: int,
) -> list[MentorStudentRead]:
    stmt = (
        select(MentorStudent, User, Adventurer)
        .join(User, MentorStudent.student_user_id == User.id)
        .join(Adventurer, Adventurer.user_id == User.id)
        .where(MentorStudent.mentor_user_id == mentor_user_id)
        .order_by(Adventurer.display_name)
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        MentorStudentRead(
            user_id=user.id,
            adventurer_id=adventurer.id,
            display_name=adventurer.display_name,
            username=adventurer.username,
            invite_code=user.invite_code,
        )
        for _link, user, adventurer in rows
    ]


async def unbind_student(
    db: AsyncSession,
    *,
    mentor_user_id: int,
    student_user_id: int,
) -> None:
    result = await db.execute(
        select(MentorStudent).where(
            MentorStudent.mentor_user_id == mentor_user_id,
            MentorStudent.student_user_id == student_user_id,
        )
    )
    link = result.scalar_one_or_none()
    if link is None:
        raise ValueError("Student is not linked to this mentor")

    await db.delete(link)
    await db.commit()
