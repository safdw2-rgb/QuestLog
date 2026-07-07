from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.crud import active_effect as effect_crud
from app.models.user import User
from app.schemas.active_effect import ActiveEffectListResponse, ActiveEffectRead

router = APIRouter(prefix="/effects", tags=["effects"])


@router.get("", response_model=ActiveEffectListResponse)
async def list_my_active_effects(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ActiveEffectListResponse:
    effects = await effect_crud.list_active_effects(db, user_id=user.id)
    return ActiveEffectListResponse(
        items=[ActiveEffectRead.model_validate(item) for item in effects],
    )
