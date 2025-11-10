# schemas.py
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

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

    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    email: str
    password_hash: Optional[str] = None

    model_config = ConfigDict(extra="allow")

class UserCreate(UserBase):
    pass

class User(UserBase):
    user_id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class PingResponse(BaseModel):
    message: str
