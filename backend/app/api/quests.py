from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import quest as quest_crud
from app.models.enums import QuestStatus
from app.schemas.quest import (
    QuestAiGenerateRequest,
    QuestAiGenerateResponse,
    QuestCreate,
    QuestDeadlineUpdate,
    QuestDeadlineUpdateResponse,
    QuestRead,
    QuestStatusUpdate,
)
from app.services.ai_quest_generator import (
    OpenRouterGenerationError,
    ai_quest_generator,
)

router = APIRouter(prefix="/quests", tags=["quests"])


@router.post("/generate-ai-details", response_model=QuestAiGenerateResponse)
async def generate_ai_quest_details(
    data: QuestAiGenerateRequest,
) -> QuestAiGenerateResponse:
    try:
        result = await ai_quest_generator.generate(data.title)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except OpenRouterGenerationError as exc:
        # Режим отладки: честная 500 + traceback в терминале uvicorn
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OpenRouter error: {exc}",
        ) from exc

    return QuestAiGenerateResponse(
        description=result.description,
        quest_type=result.quest_type,
        difficulty=result.difficulty,
        xp_reward=result.xp_reward,
        gold_reward=result.gold_reward,
        source=result.source,
    )


@router.post("", response_model=QuestRead, status_code=status.HTTP_201_CREATED)
async def create_quest(
    data: QuestCreate,
    db: AsyncSession = Depends(get_db),
) -> QuestRead:
    return await quest_crud.create_quest(db, data)


@router.get("", response_model=list[QuestRead])
async def get_quests(
    adventurer_id: int | None = Query(default=None),
    status: QuestStatus | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[QuestRead]:
    return await quest_crud.list_quests(db, adventurer_id=adventurer_id, status=status)


@router.patch("/{quest_id}/deadline", response_model=QuestDeadlineUpdateResponse)
async def update_quest_deadline(
    quest_id: int,
    data: QuestDeadlineUpdate,
    db: AsyncSession = Depends(get_db),
) -> QuestDeadlineUpdateResponse:
    quest = await quest_crud.get_quest(db, quest_id)
    if quest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quest not found")

    try:
        return await quest_crud.update_quest_deadline(db, quest, data.deadline)
    except ValueError as exc:
        message = str(exc)
        status_code = (
            status.HTTP_400_BAD_REQUEST
            if "not enough gold" in message.lower()
            else status.HTTP_404_NOT_FOUND
        )
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.patch("/{quest_id}/status", response_model=QuestRead)
async def update_quest_status(
    quest_id: int,
    data: QuestStatusUpdate,
    db: AsyncSession = Depends(get_db),
) -> QuestRead:
    quest = await quest_crud.get_quest(db, quest_id)
    if quest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quest not found")

    if data.status == QuestStatus.FAILED and not data.fail_reason:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="fail_reason is required when status is failed",
        )

    try:
        return await quest_crud.update_quest_status(db, quest, data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
