from datetime import date, datetime
from typing import Optional, List
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
    goal: Optional[str] = None           # ⬅️ was notes
    main_exercise: Optional[str] = None


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
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class User(UserBase):
    user_id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class PingResponse(BaseModel):
    message: str


class DashboardSummary(BaseModel):
    steps_today: int
    calories_today: float
    sleep_hours_today: float
    weekly_steps: List[int]
    latest_goal_description: Optional[str] = None



# ---------- Goal & ExerciseType ----------

class GoalBase(BaseModel):
    user_id: int
    date: date
    text: str


class GoalCreate(GoalBase):
    pass


class GoalOut(GoalBase):
    goal_id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class ExerciseTypeBase(BaseModel):
    user_id: int
    name: str


class ExerciseTypeCreate(ExerciseTypeBase):
    pass


class ExerciseTypeOut(ExerciseTypeBase):
    exercise_type_id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ---------- Combined Data Entry ----------

class DataEntryBase(BaseModel):
    date: date
    steps: Optional[int] = None
    heart_rate_avg: Optional[int] = None
    sleep_hours: Optional[float] = None
    calories_burned: Optional[int] = None
    exercise_minutes: Optional[int] = None
    main_exercise: Optional[str] = None
    goal: Optional[str] = None


class DataEntryCreate(DataEntryBase):
    user_id: int


class DataEntryOut(DataEntryBase):
    user_id: int

class FollowerBase(BaseModel):
    user_id: int
    follower_user_id: int

class FollowerCreate(FollowerBase):
    pass

class FollowerOut(FollowerBase):
    follower_id: int
    since: datetime

class LeaderboardEntry(BaseModel):
    user_id: int
    name: str
    steps: int
    rank: int


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]
    current_user_rank: Optional[int] = None
    has_friends: bool
class LeaderboardEntryOut(BaseModel):
    user_id: int
    username: str
    steps: int
    rank: int


class LeaderboardResponseOut(BaseModel):
    entries: List[LeaderboardEntryOut]
    current_user_entry: Optional[LeaderboardEntryOut] = None

class CommunityPostCreate(BaseModel):
    user_id: int
    content: str
    visibility: str  # or use an Enum if you have one

class CommunityPostOut(BaseModel):
    post_id: int
    user_id: int
    content: str
    visibility: str
    created_at: datetime

class PostCommentCreate(BaseModel):
    post_id: int
    user_id: int
    content: str

class PostCommentOut(BaseModel):
    comment_id: int
    post_id: int
    user_id: int
    content: str
    created_at: datetime

class PostReactionCreate(BaseModel):
    post_id: int
    user_id: int
    reaction_type: str

class ReactionSummary(BaseModel):
    reaction_type: str
    count: int

class PostReactionOut(BaseModel):
    post_id: int
    user_id: int
    reaction_type: str
    created_at: datetime        