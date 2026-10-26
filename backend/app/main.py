from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.config import settings
from app.routers import auth, bvi, conspects, curriculum, internal, plans, progress, sections, subjects, topics

app = FastAPI(title="Без Вступительных API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Большие конспекты — по ~1 МБ HTML, сжатие уменьшает их в несколько раз. nginx проксируемые
# ответы по умолчанию не сжимает (gzip_proxied off), поэтому сжимает сам бэкенд.
app.add_middleware(GZipMiddleware, minimum_size=1024)

app.include_router(auth.router, prefix="/api")
app.include_router(subjects.router, prefix="/api")
app.include_router(sections.router, prefix="/api")
app.include_router(topics.router, prefix="/api")
app.include_router(curriculum.router, prefix="/api")
app.include_router(conspects.router, prefix="/api")
app.include_router(bvi.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(progress.router, prefix="/api")
app.include_router(internal.router, prefix="/api")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
