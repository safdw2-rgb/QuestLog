import logging
from contextlib import asynccontextmanager
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.adventurers import router as adventurers_router
from app.api.auth import router as auth_router
from app.api.effects import router as effects_router
from app.api.factions import router as factions_router
from app.api.mentor import router as mentor_router
from app.api.quests import router as quests_router
from app.api.rewards import router as rewards_router
from app.config import settings
from app.services.active_effect_expiry import check_expired_effects
from app.services.daily_quest_reset import reset_daily_quests
from app.services.faction_season_report import faction_season_service
from app.services.nightly_lore_refresh import refresh_all_adventurers_lore
from app.services.quest_reminders import check_quest_reminders
from app.services.weekly_reputation_reset import reset_weekly_reputation

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)-5s [%(name)s] %(message)s",
)

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    tz = ZoneInfo(settings.daily_reset_timezone)
    scheduler.add_job(
        reset_daily_quests,
        CronTrigger(hour=0, minute=0, timezone=tz),
        id="daily_quest_reset",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.add_job(
        check_quest_reminders,
        IntervalTrigger(minutes=1),
        id="quest_reminders",
        replace_existing=True,
        misfire_grace_time=120,
    )
    scheduler.add_job(
        faction_season_service.run_monthly_season,
        CronTrigger(day=1, hour=9, minute=0, timezone=tz),
        id="faction_monthly_season",
        replace_existing=True,
        misfire_grace_time=7200,
    )
    scheduler.add_job(
        refresh_all_adventurers_lore,
        CronTrigger(hour=3, minute=0, timezone=tz),
        id="nightly_adventurer_lore",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.add_job(
        check_expired_effects,
        IntervalTrigger(minutes=1),
        id="active_effect_expiry",
        replace_existing=True,
        misfire_grace_time=120,
    )
    scheduler.add_job(
        reset_weekly_reputation,
        CronTrigger(day_of_week="mon", hour=0, minute=0, timezone=tz),
        id="weekly_reputation_reset",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
    logger.info(
        "Schedulers started: daily reset 00:00 %s, reminders every 1 min, "
        "effect expiry every 1 min, weekly rep reset Mon 00:00 %s, "
        "faction season 1st 09:00 %s, nightly lore 03:00 %s",
        settings.daily_reset_timezone,
        settings.daily_reset_timezone,
        settings.daily_reset_timezone,
        settings.daily_reset_timezone,
    )
    yield
    scheduler.shutdown(wait=False)
    logger.info("Daily quest scheduler stopped")


app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://questlog.pp.ua",
        "https://api.questlog.pp.ua",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(quests_router, prefix="/api/v1")
app.include_router(adventurers_router, prefix="/api/v1")
app.include_router(rewards_router, prefix="/api/v1")
app.include_router(factions_router, prefix="/api/v1")
app.include_router(effects_router, prefix="/api/v1")
app.include_router(mentor_router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
