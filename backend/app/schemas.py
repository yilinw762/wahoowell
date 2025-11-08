# schemas.py
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date

class HealthLogBase(BaseModel):
    log_date: date
    weight: Optional[float] = None
    bmi: Optional[float] = None
    steps: Optional[int] = None
    sleep_hours: Optional[float] = None
    stress_level: Optional[int] = None
    exercise_minutes: Optional[int] = None

class HealthLogCreate(HealthLogBase):
    user_id: int

class HealthLogOut(HealthLogBase):
    user_id: int
    id: int
    model_config = ConfigDict(from_attributes=True)  # replaces Config.orm_mode = True
