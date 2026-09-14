from fastapi import APIRouter

from app.schemas.content import SubjectOut

router = APIRouter(prefix="/subjects", tags=["content"])

_SUBJECTS = [
    SubjectOut(id="physics", title="Физика"),
    SubjectOut(id="math", title="Математика"),
]


@router.get("", response_model=list[SubjectOut])
async def list_subjects() -> list[SubjectOut]:
    return _SUBJECTS
