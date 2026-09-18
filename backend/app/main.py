from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, curriculum, olympiads, plans, progress, sections, subjects, topics, universities

app = FastAPI(title="Без Вступительных API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(subjects.router, prefix="/api")
app.include_router(sections.router, prefix="/api")
app.include_router(topics.router, prefix="/api")
app.include_router(curriculum.router, prefix="/api")
app.include_router(olympiads.router, prefix="/api")
app.include_router(universities.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(progress.router, prefix="/api")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
