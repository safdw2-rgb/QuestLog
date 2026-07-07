import random
from datetime import UTC, datetime
from typing import Literal

from sqlalchemy import case, func, nulls_last, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.adventurer import get_adventurer, to_adventurer_read
from app.models.enums import QuestDifficulty, QuestStatus, QuestType
from app.models.faction import Faction
from app.models.quest import Quest
from app.schemas.quest import QuestBargainResponse, QuestDeadlineUpdateResponse, QuestRead
from app.crud.faction import REPUTATION_LOSS_ON_FAIL, adjust_faction_reputation
from app.crud.mentor import is_mentor_of_student
from app.crud.obsidian import record_quest_completion_lore
from app.schemas.quest import (
    QuestCreate,
    QuestStatusUpdate,
    QuestUpdate,
    QuestUpdateResponse,
)
from app.services.gold_economy import gold_for_difficulty
from app.services.quest_completion import (
    AdventurerNotFoundError,
    quest_completion_service,
)


async def create_quest(
    db: AsyncSession,
    data: QuestCreate,
    *,
    creator_user_id: int,
    adventurer_id: int,
) -> Quest:
    assignee_id = data.assigned_to_id or adventurer_id
    if assignee_id != adventurer_id:
        student = await get_adventurer(db, assignee_id)
        if student is None:
            raise ValueError("Assigned adventurer not found")
        if not await is_mentor_of_student(
            db,
            mentor_user_id=creator_user_id,
            student_user_id=student.user_id,
        ):
            raise ValueError("Not allowed to assign quests to this adventurer")

    payload = data.model_dump(exclude_none=True, exclude={"assigned_to_id"})
    payload["gold_reward"] = gold_for_difficulty(data.difficulty)

    quest = Quest(
        adventurer_id=assignee_id,
        creator_user_id=creator_user_id,
        **payload,
    )
    db.add(quest)
    await db.commit()
    await db.refresh(quest)
    return quest


DEADLINE_RESCHEDULE_COST = 20
BARGAIN_COST = 10

QuestSortBy = Literal["created_desc", "faction", "difficulty", "urgency"]

DIFFICULTY_SORT_RANK = {
    QuestDifficulty.LEGENDARY: 0,
    QuestDifficulty.HARD: 1,
    QuestDifficulty.NORMAL: 2,
    QuestDifficulty.EASY: 3,
    QuestDifficulty.TRIVIAL: 4,
}


def _apply_quest_sort(stmt, sort_by: QuestSortBy):
    if sort_by == "faction":
        stmt = stmt.outerjoin(Faction, Quest.faction_id == Faction.id)
        return stmt.order_by(
            nulls_last(Faction.name.asc()),
            Quest.sort_order,
            Quest.created_at.desc(),
            Quest.id.desc(),
        )
    if sort_by == "difficulty":
        difficulty_rank = case(
            *(
                (Quest.difficulty == value, rank)
                for value, rank in DIFFICULTY_SORT_RANK.items()
            ),
            else_=99,
        )
        return stmt.order_by(
            difficulty_rank,
            Quest.sort_order,
            Quest.created_at.desc(),
            Quest.id.desc(),
        )
    if sort_by == "urgency":
        urgency_at = case(
            (Quest.deadline.is_not(None), Quest.deadline),
            else_=Quest.reminder_time,
        )
        return stmt.order_by(
            nulls_last(urgency_at.asc()),
            Quest.sort_order,
            Quest.created_at.desc(),
            Quest.id.desc(),
        )
    if sort_by == "created_desc":
        return stmt.order_by(Quest.created_at.desc(), Quest.id.desc())
    return stmt.order_by(
        Quest.sort_order,
        Quest.created_at.desc(),
        Quest.id.desc(),
    )


async def list_quests(
    db: AsyncSession,
    *,
    adventurer_id: int | None = None,
    status: QuestStatus | None = None,
    page: int = 1,
    size: int = 20,
    sort_by: QuestSortBy = "created_desc",
    fetch_all: bool = False,
) -> tuple[list[Quest], int]:
    base = select(Quest)
    count_stmt = select(func.count()).select_from(Quest)

    if adventurer_id is not None:
        base = base.where(Quest.adventurer_id == adventurer_id)
        count_stmt = count_stmt.where(Quest.adventurer_id == adventurer_id)
    if status is not None:
        base = base.where(Quest.status == status)
        count_stmt = count_stmt.where(Quest.status == status)

    total_result = await db.execute(count_stmt)
    total = int(total_result.scalar_one())

    stmt = _apply_quest_sort(base, sort_by)
    if not fetch_all:
        stmt = stmt.offset((page - 1) * size).limit(size)

    result = await db.execute(stmt)
    return list(result.scalars().all()), total


async def get_quest(db: AsyncSession, quest_id: int) -> Quest | None:
    return await db.get(Quest, quest_id)


def _deadlines_equal(
    current: datetime | None,
    new: datetime | None,
) -> bool:
    if current is None and new is None:
        return True
    if current is None or new is None:
        return False
    return int(current.timestamp()) == int(new.timestamp())


def _deadline_dates_equal(
    current: datetime | None,
    new: datetime | None,
) -> bool:
    """Сравнение по календарной дате — для штрафа за перенос дедлайна."""
    if current is None and new is None:
        return True
    if current is None or new is None:
        return False
    return current.date() == new.date()


async def update_quest_deadline(
    db: AsyncSession,
    quest: Quest,
    deadline: datetime | None,
    reminder_time: datetime | None | object = ...,
) -> QuestDeadlineUpdateResponse:
    adventurer = await get_adventurer(db, quest.adventurer_id)
    if adventurer is None:
        raise ValueError(f"Adventurer {quest.adventurer_id} not found")

    gold_spent = 0

    if deadline is not ...:
        deadline_date_changed = not _deadline_dates_equal(quest.deadline, deadline)
        if (
            deadline_date_changed
            and quest.quest_type in (QuestType.MAIN, QuestType.SIDE)
        ):
            if adventurer.gold < DEADLINE_RESCHEDULE_COST:
                raise ValueError(
                    f"Not enough gold: need {DEADLINE_RESCHEDULE_COST}, "
                    f"have {adventurer.gold}",
                )
            adventurer.gold -= DEADLINE_RESCHEDULE_COST
            gold_spent = DEADLINE_RESCHEDULE_COST
        quest.deadline = deadline

    if reminder_time is not ...:
        quest.reminder_time = reminder_time  # type: ignore[assignment]

    await db.commit()
    await db.refresh(quest)
    await db.refresh(adventurer)

    return QuestDeadlineUpdateResponse(
        quest=QuestRead.model_validate(quest),
        adventurer=to_adventurer_read(adventurer),
        gold_spent=gold_spent,
    )


async def update_quest_status(
    db: AsyncSession,
    quest: Quest,
    data: QuestStatusUpdate,
) -> Quest:
    now = datetime.now(UTC)

    if data.status == QuestStatus.COMPLETED:
        if quest.status != QuestStatus.COMPLETED:
            try:
                await quest_completion_service.complete_quest(db, quest)
            except AdventurerNotFoundError as exc:
                raise ValueError(f"Adventurer {exc.args[0]} not found") from exc
        await db.commit()
        await db.refresh(quest)
        await record_quest_completion_lore(db, quest)

        return quest

    quest.status = data.status

    if data.status == QuestStatus.FAILED:
        if quest.quest_type == QuestType.DAILY:
            raise ValueError("Daily quests cannot be failed")
        quest.failed_at = now
        quest.completed_at = None
        quest.fail_reason = data.fail_reason
        quest.xp_earned = 0
        quest.gold_earned = 0
        if (
            quest.faction_id is not None
            and quest.quest_type != QuestType.DAILY
        ):
            await adjust_faction_reputation(
                db,
                quest.faction_id,
                quest.adventurer_id,
                -REPUTATION_LOSS_ON_FAIL,
            )
    elif data.status == QuestStatus.ACTIVE:
        quest.completed_at = None
        quest.failed_at = None
        quest.fail_reason = None
        quest.xp_earned = 0
        quest.gold_earned = 0

    await db.commit()
    await db.refresh(quest)
    return quest


async def update_quest(
    db: AsyncSession,
    quest: Quest,
    data: QuestUpdate,
) -> QuestUpdateResponse:
    if quest.status not in {QuestStatus.ACTIVE, QuestStatus.DEFERRED}:
        raise ValueError("Only active or deferred quests can be edited")

    if quest.parent_quest_id is not None:
        raise ValueError("Subquests cannot be edited through this endpoint")

    adventurer = await get_adventurer(db, quest.adventurer_id)
    if adventurer is None:
        raise ValueError(f"Adventurer {quest.adventurer_id} not found")

    gold_spent = 0
    fields_set = data.model_fields_set

    if "title" in fields_set and data.title is not None:
        title = data.title.strip()
        if not title:
            raise ValueError("title cannot be empty")
        quest.title = title

    if "description" in fields_set:
        quest.description = data.description

    if "faction_id" in fields_set:
        quest.faction_id = data.faction_id

    if "latitude" in fields_set:
        quest.latitude = data.latitude
    if "longitude" in fields_set:
        quest.longitude = data.longitude

    if "deadline" in fields_set:
        deadline = data.deadline
        deadline_date_changed = not _deadline_dates_equal(quest.deadline, deadline)
        if (
            deadline_date_changed
            and quest.quest_type in (QuestType.MAIN, QuestType.SIDE)
        ):
            if adventurer.gold < DEADLINE_RESCHEDULE_COST:
                raise ValueError(
                    f"Not enough gold: need {DEADLINE_RESCHEDULE_COST}, "
                    f"have {adventurer.gold}",
                )
            adventurer.gold -= DEADLINE_RESCHEDULE_COST
            gold_spent = DEADLINE_RESCHEDULE_COST
        quest.deadline = deadline

    if "reminder_time" in fields_set:
        quest.reminder_time = data.reminder_time

    if "frequency" in fields_set and data.frequency is not None:
        if quest.quest_type != QuestType.DAILY:
            raise ValueError("frequency can only be set for daily quests")
        quest.frequency = data.frequency

    await db.commit()
    await db.refresh(quest)
    await db.refresh(adventurer)

    return QuestUpdateResponse(
        quest=QuestRead.model_validate(quest),
        adventurer=to_adventurer_read(adventurer),
        gold_spent=gold_spent,
    )


async def retire_daily_quest(db: AsyncSession, quest: Quest) -> Quest:
    if quest.quest_type != QuestType.DAILY:
        raise ValueError("Only daily quests can be retired")

    if quest.status not in {QuestStatus.ACTIVE, QuestStatus.COMPLETED}:
        raise ValueError("Daily quest is already removed from the pool")

    quest.status = QuestStatus.ABANDONED
    quest.completed_at = None
    quest.failed_at = None
    quest.fail_reason = None
    quest.xp_earned = 0
    quest.gold_earned = 0

    await db.commit()
    await db.refresh(quest)
    return quest


def _bargain_outcome(roll: int) -> tuple[Literal["fail", "success", "critical"], str, float]:
    if roll >= 18:
        return (
            "critical",
            "Критический успех! Вы выторговали +50% золота!",
            1.5,
        )
    if roll >= 10:
        return (
            "success",
            "Успех! Вы выторговали +25% золота!",
            1.25,
        )
    return (
        "fail",
        "Торги провалились. Контрагент не уступил — награда осталась прежней.",
        1.0,
    )


async def bargain_quest_gold(
    db: AsyncSession,
    quest: Quest,
) -> QuestBargainResponse:
    if quest.status != QuestStatus.ACTIVE:
        raise ValueError("Bargain is only available for active quests")

    if quest.bargained:
        raise ValueError("Bargain already used for this quest")

    adventurer = await get_adventurer(db, quest.adventurer_id)
    if adventurer is None:
        raise ValueError(f"Adventurer {quest.adventurer_id} not found")

    if adventurer.gold < BARGAIN_COST:
        raise ValueError(
            f"Not enough gold: need {BARGAIN_COST}, have {adventurer.gold}",
        )

    adventurer.gold -= BARGAIN_COST
    roll = random.randint(1, 20)
    outcome, message, multiplier = _bargain_outcome(roll)

    base_gold = gold_for_difficulty(quest.difficulty)
    if quest.gold_reward < base_gold:
        quest.gold_reward = base_gold

    if multiplier > 1.0:
        quest.gold_reward = max(1, round(quest.gold_reward * multiplier))

    quest.bargained = True

    await db.commit()
    await db.refresh(quest)
    await db.refresh(adventurer)

    return QuestBargainResponse(
        quest=QuestRead.model_validate(quest),
        adventurer=to_adventurer_read(adventurer),
        roll=roll,
        outcome=outcome,
        message=message,
        gold_spent=BARGAIN_COST,
    )
