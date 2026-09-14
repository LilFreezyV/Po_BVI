from pydantic import BaseModel


class TopicProgressOut(BaseModel):
    status: str
    percent: int
    solved: int
    total: int
