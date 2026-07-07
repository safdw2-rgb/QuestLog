import logging
import re
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import (
    generate_password_reset_token,
    hash_password,
    hash_password_reset_token,
    password_reset_expires_at,
    verify_password,
)
from app.crud.faction import initialize_faction_reputation_for_adventurer
from app.crud.mentor import _ensure_unique_invite_code
from app.models.adventurer import Adventurer
from app.models.user import User
from app.schemas.auth import UserRegister

logger = logging.getLogger(__name__)

FORGOT_PASSWORD_MESSAGE = (
    "Если аккаунт с таким email существует, ссылка для сброса пароля была создана."
)


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    return await db.get(User, user_id)


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    normalized = email.strip().lower()
    result = await db.execute(select(User).where(User.email == normalized))
    return result.scalar_one_or_none()


async def authenticate_user(
    db: AsyncSession,
    email: str,
    password: str,
) -> User | None:
    user = await get_user_by_email(db, email)
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user


def _normalize_username(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "", value.lower())
    return cleaned[:64] or "hero"


async def _ensure_unique_username(db: AsyncSession, base: str) -> str:
    candidate = _normalize_username(base)
    suffix = 0

    while True:
        username = candidate if suffix == 0 else f"{candidate[:58]}_{suffix}"
        result = await db.execute(
            select(Adventurer.id).where(Adventurer.username == username),
        )
        if result.scalar_one_or_none() is None:
            return username
        suffix += 1


async def register_user(db: AsyncSession, data: UserRegister) -> tuple[User, Adventurer]:
    email = data.email.strip().lower()
    existing = await get_user_by_email(db, email)
    if existing is not None:
        raise ValueError("email already registered")

    username_base = data.username or email.split("@", 1)[0]
    username = await _ensure_unique_username(db, username_base)
    display_name = (data.display_name or username).strip() or username

    user = User(
        email=email,
        hashed_password=hash_password(data.password),
        is_active=True,
        invite_code=await _ensure_unique_invite_code(db),
    )
    adventurer = Adventurer(
        user=user,
        username=username,
        display_name=display_name,
    )
    db.add(user)
    db.add(adventurer)
    await db.flush()
    await initialize_faction_reputation_for_adventurer(db, adventurer.id)
    await db.commit()
    await db.refresh(user)
    await db.refresh(adventurer)
    return user, adventurer


async def request_password_reset(db: AsyncSession, email: str) -> str:
    user = await get_user_by_email(db, email)
    if user is None or not user.is_active:
        return FORGOT_PASSWORD_MESSAGE

    token = generate_password_reset_token()
    user.password_reset_token_hash = hash_password_reset_token(token)
    user.password_reset_expires_at = password_reset_expires_at()
    await db.commit()

    reset_url = (
        f"{settings.frontend_base_url.rstrip('/')}"
        f"/reset-password?token={token}"
    )
    logger.info("Password reset link for %s: %s", user.email, reset_url)
    return FORGOT_PASSWORD_MESSAGE


async def reset_password_with_token(
    db: AsyncSession,
    *,
    token: str,
    new_password: str,
) -> None:
    token_hash = hash_password_reset_token(token.strip())
    result = await db.execute(
        select(User).where(User.password_reset_token_hash == token_hash),
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise ValueError("invalid or expired reset token")

    expires_at = user.password_reset_expires_at
    if expires_at is None or expires_at < datetime.now(UTC):
        user.password_reset_token_hash = None
        user.password_reset_expires_at = None
        await db.commit()
        raise ValueError("invalid or expired reset token")

    user.hashed_password = hash_password(new_password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    await db.commit()


async def create_legacy_user_for_adventurer(
    db: AsyncSession,
    adventurer: Adventurer,
    *,
    email: str,
    password: str,
) -> User:
    user = User(
        email=email.strip().lower(),
        hashed_password=hash_password(password),
        is_active=True,
        invite_code=await _ensure_unique_invite_code(db),
    )
    adventurer.user = user
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await db.refresh(adventurer)
    return user
