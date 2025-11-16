# schemas.py
from datetime import date, datetime
from typing import Optional, List, Literal

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
    username: Optional[str] = None
    model_config = ConfigDict(extra="allow")

class UserCreate(UserBase):
    password: str  # make password_hash required for creation

class UserLogin(BaseModel):
    email: str
    password: str


class User(UserBase):
    user_id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class PingResponse(BaseModel):
    message: str

class CommunityPostCreate(BaseModel):
    user_id: int
    content: str
    visibility: Literal["public", "followers", "private"] = "public"


class CommunityPostOut(CommunityPostCreate):
    post_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PostCommentCreate(BaseModel):
    post_id: int
    user_id: int
    content: str

class PostCommentOut(PostCommentCreate):
    comment_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PostReactionCreate(BaseModel):
    post_id: int
    user_id: int
    reaction_type: str

class ReactionSummary(BaseModel):
    post_id: int
    reaction_type: str
    count: int
