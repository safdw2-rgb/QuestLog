from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_adventurer,
    get_current_user,
    get_db,
    get_editable_quest,
    get_owned_quest,
)
from app.crud import faction as faction_crud
from app.crud import quest as quest_crud
from app.models.adventurer import Adventurer
from app.models.enums import QuestStatus
from app.models.quest import Quest
from app.models.user import User
from app.schemas.quest import (
    QuestAiGenerateRequest,
    QuestAiGenerateResponse,
    QuestAiImproveRequest,
    QuestAiImproveResponse,
    QuestBargainResponse,
    QuestCreate,
    QuestDeadlineUpdate,
    QuestDeadlineUpdateResponse,
    QuestPageResponse,
    QuestRead,
    QuestStatusUpdate,
    QuestUpdate,
    QuestUpdateResponse,
)
from app.services.ai_generator import GeminiGenerationError, ai_quest_generator

router = APIRouter(prefix="/quests", tags=["quests"])


@router.post("/generate-ai-details", response_model=QuestAiGenerateResponse)
async def generate_ai_quest_details(
    data: QuestAiGenerateRequest,
    adventurer: Adventurer = Depends(get_current_adventurer),
    db: AsyncSession = Depends(get_db),
) -> QuestAiGenerateResponse:
    faction_name: str | None = None
    if data.faction_id is not None:
        faction = await faction_crud.get_faction(db, data.faction_id)
        if faction is not None:
            faction_name = faction.name

    try:
        result = await ai_quest_generator.generate(
            data.title,
            latitude=data.latitude,
            longitude=data.longitude,
            faction_name=faction_name,
            hero_level=adventurer.level,
            hero_display_name=adventurer.display_name,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except GeminiGenerationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gemini error: {exc}",
        ) from exc

    return QuestAiGenerateResponse(
        description=result.description,
        quest_type=result.quest_type,
        difficulty=result.difficulty,
        xp_reward=result.xp_reward,
        gold_reward=result.gold_reward,
        source=result.source,
    )


@router.post("/improve-ai-details", response_model=QuestAiImproveResponse)
async def improve_ai_quest_details(
    data: QuestAiImproveRequest,
    adventurer: Adventurer = Depends(get_current_adventurer),
    db: AsyncSession = Depends(get_db),
) -> QuestAiImproveResponse:
    faction_name: str | None = None
    if data.faction_id is not None:
        faction = await faction_crud.get_faction(db, data.faction_id)
        if faction is not None:
            faction_name = faction.name

    try:
        result = await ai_quest_generator.improve(
            data.title,
            description=data.description,
            faction_name=faction_name,
            hero_level=adventurer.level,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except GeminiGenerationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gemini error: {exc}",
        ) from exc

    return QuestAiImproveResponse(
        title=result.title,
        description=result.description,
        source=result.source,
    )


@router.post("", response_model=QuestRead, status_code=status.HTTP_201_CREATED)
async def create_quest(
    data: QuestCreate,
    adventurer: Adventurer = Depends(get_current_adventurer),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuestRead:
    try:
        return await quest_crud.create_quest(
            db,
            data,
            creator_user_id=user.id,
            adventurer_id=adventurer.id,
        )
    except ValueError as exc:
        message = str(exc)
        status_code = (
            status.HTTP_403_FORBIDDEN
            if "not allowed" in message.lower()
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.get("", response_model=QuestPageResponse)
async def get_quests(
    status: QuestStatus | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=500),
    sort_by: quest_crud.QuestSortBy = Query(default="created_desc"),
    fetch_all: bool = Query(default=False),
    adventurer: Adventurer = Depends(get_current_adventurer),
    db: AsyncSession = Depends(get_db),
) -> QuestPageResponse:
    items, total = await quest_crud.list_quests(
        db,
        adventurer_id=adventurer.id,
        status=status,
        page=page,
        size=size,
        sort_by=sort_by,
        fetch_all=fetch_all,
    )
    return QuestPageResponse(
        items=items,
        total=total,
        page=1 if fetch_all else page,
        size=total if fetch_all else size,
    )


@router.patch("/{quest_id}/deadline", response_model=QuestDeadlineUpdateResponse)
async def update_quest_deadline(
    data: QuestDeadlineUpdate,
    quest: Quest = Depends(get_editable_quest),
    db: AsyncSession = Depends(get_db),
) -> QuestDeadlineUpdateResponse:
    try:
        fields_set = data.model_fields_set
        return await quest_crud.update_quest_deadline(
            db,
            quest,
            data.deadline if "deadline" in fields_set else ...,
            data.reminder_time if "reminder_time" in fields_set else ...,
        )
    except ValueError as exc:
        message = str(exc)
        status_code = (
            status.HTTP_400_BAD_REQUEST
            if "not enough gold" in message.lower()
            else status.HTTP_404_NOT_FOUND
        )
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.post("/{quest_id}/bargain", response_model=QuestBargainResponse)
async def bargain_quest_reward(
    quest: Quest = Depends(get_editable_quest),
    db: AsyncSession = Depends(get_db),
) -> QuestBargainResponse:
    try:
        return await quest_crud.bargain_quest_gold(db, quest)
    except ValueError as exc:
        message = str(exc)
        if "not enough gold" in message.lower():
            status_code = status.HTTP_400_BAD_REQUEST
        elif "already used" in message.lower():
            status_code = status.HTTP_409_CONFLICT
        elif "only available" in message.lower():
            status_code = status.HTTP_400_BAD_REQUEST
        else:
            status_code = status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.post("/{quest_id}/retire-daily", response_model=QuestRead)
async def retire_daily_quest(
    quest: Quest = Depends(get_editable_quest),
    db: AsyncSession = Depends(get_db),
) -> QuestRead:
    try:
        return await quest_crud.retire_daily_quest(db, quest)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.patch("/{quest_id}", response_model=QuestUpdateResponse)
async def update_quest(
    data: QuestUpdate,
    quest: Quest = Depends(get_editable_quest),
    db: AsyncSession = Depends(get_db),
) -> QuestUpdateResponse:
    try:
        return await quest_crud.update_quest(db, quest, data)
    except ValueError as exc:
        message = str(exc)
        status_code = (
            status.HTTP_400_BAD_REQUEST
            if "not enough gold" in message.lower()
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.patch("/{quest_id}/status", response_model=QuestRead)
async def update_quest_status(
    data: QuestStatusUpdate,
    quest: Quest = Depends(get_owned_quest),
    db: AsyncSession = Depends(get_db),
) -> QuestRead:
    if data.status == QuestStatus.FAILED and not data.fail_reason:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="fail_reason is required when status is failed",
        )

    try:
        return await quest_crud.update_quest_status(db, quest, data)
    except ValueError as exc:
        message = str(exc)
        status_code = (
            status.HTTP_400_BAD_REQUEST
            if "daily" in message.lower()
            else status.HTTP_404_NOT_FOUND
        )
        raise HTTPException(status_code=status_code, detail=message) from exc
