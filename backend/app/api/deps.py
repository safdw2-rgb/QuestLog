from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.crud import adventurer as adventurer_crud
from app.crud import quest as quest_crud
from app.crud import user as user_crud
from app.db.session import get_db
from app.models.adventurer import Adventurer
from app.models.quest import Quest
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_exception

    user = await user_crud.get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise credentials_exception
    return user


async def get_current_adventurer(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Adventurer:
    adventurer = await adventurer_crud.get_adventurer_by_user_id(db, user.id)
    if adventurer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Adventurer profile not found",
        )
    return adventurer


async def get_owned_quest(
    quest_id: int,
    adventurer: Adventurer = Depends(get_current_adventurer),
    db: AsyncSession = Depends(get_db),
) -> Quest:
    quest = await quest_crud.get_quest(db, quest_id)
    if quest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quest not found",
        )
    if quest.adventurer_id != adventurer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this quest",
        )
    return quest


async def get_editable_quest(
    quest: Quest = Depends(get_owned_quest),
    user: User = Depends(get_current_user),
) -> Quest:
    if quest.creator_user_id is not None and quest.creator_user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the quest creator can modify this quest",
        )
    return quest


__all__ = [
    "get_current_adventurer",
    "get_current_user",
    "get_db",
    "get_editable_quest",
    "get_owned_quest",
    "oauth2_scheme",
]
