# schemas.py
from pydantic import BaseModel, ConfigDict # type: ignore
from typing import Optional
from datetime import date, datetime

class HealthLogBase(BaseModel):
    user_id: int
    date: date
    steps: Optional[int] = None
    heart_rate_avg: Optional[int] = None
    sleep_hours: Optional[float] = None
    calories_burned: Optional[int] = None
    exercise_minutes: Optional[int] = None
    stress_level: Optional[int] = None
    notes: Optional[str] = None

class HealthLogCreate(HealthLogBase):
    pass

class HealthLogOut(HealthLogBase):
    log_id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)  # replaces Config.orm_mode = True