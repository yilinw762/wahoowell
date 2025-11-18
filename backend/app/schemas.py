from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


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


class HealthLogCreate(BaseModel):
    user_id: int
    date: date
    steps: Optional[int] = 0
    heart_rate_avg: Optional[int] = None
    sleep_hours: Optional[float] = None
    calories_burned: Optional[int] = None
    exercise_minutes: Optional[int] = 0
    stress_level: Optional[int] = None

    notes: Optional[str] = None   # ← ADD THIS
    main_exercise: Optional[str] = None


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


class CommunityPostImageBase(BaseModel):
    file_name: str
    storage_path: str
    public_url: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None


class CommunityPostImageCreate(CommunityPostImageBase):
    pass


class CommunityPostImageOut(CommunityPostImageBase):
    image_id: int
    created_at: datetime


class CommunityPostCreate(BaseModel):
    user_id: int
    content: str
    visibility: str  # or use an Enum if you have one
    images: list[CommunityPostImageCreate] = Field(default_factory=list)


class CommunityPostOut(BaseModel):
    post_id: int
    user_id: int
    username: Optional[str] = None
    content: str
    visibility: str
    created_at: datetime
    images: list[CommunityPostImageOut] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


class PostCommentCreate(BaseModel):
    post_id: int
    user_id: int
    content: str


class PostCommentOut(BaseModel):
    comment_id: int
    post_id: int
    user_id: int
    username: Optional[str] = None
    content: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

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

class ProfileBase(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[int] = None
    timezone: Optional[str] = None
    bio: Optional[str] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(ProfileBase):
    pass

class ProfileOut(ProfileBase):
    user_id: int

class ProfileWithFollowStatus(BaseModel):
    user_id: int
    username: str | None = None
    email: str
    age: int | None = None
    gender: str | None = None
    height_cm: int | None = None
    weight_kg: int | None = None
    bio: str | None = None
    timezone: str | None = None
    is_following: bool