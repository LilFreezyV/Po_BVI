import enum


class SubjectEnum(str, enum.Enum):
    physics = "physics"
    math = "math"


class LevelEnum(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"
