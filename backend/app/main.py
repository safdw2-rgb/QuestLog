from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.adventurers import router as adventurers_router
from app.api.quests import router as quests_router
from app.config import settings

app = FastAPI(title=settings.app_title, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(quests_router, prefix="/api/v1")
app.include_router(adventurers_router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
