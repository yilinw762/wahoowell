# app/api/leaderboard.py
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("/{user_id}", response_model=schemas.LeaderboardResponse)
def get_leaderboard(user_id: int, db: Session = Depends(get_db)):
    """
    Returns today's leaderboard for the user and the users they follow.

    - If a friend has no health log for today => steps = 0.
    - Sorted by steps desc.
    """

    today = date.today()

    # ----- Who do I follow? -----
    follow_rows = (
        db.query(models.Follower)
        .filter(models.Follower.user_id == user_id)
        .all()
    )
    friend_ids = [row.follower_user_id for row in follow_rows]

    has_friends = len(friend_ids) > 0

    # Always include myself in the leaderboard calculations
    user_ids = friend_ids + [user_id]

    if not user_ids:
        # This should never happen because we always include user_id,
        # but keep it safe.
        return schemas.LeaderboardResponse(
            entries=[],
            current_user_rank=None,
            has_friends=False,
        )

    # ----- Steps per user for TODAY -----
    steps_rows = (
        db.query(
            models.HealthLog.user_id,
            func.coalesce(func.sum(models.HealthLog.steps), 0).label("steps"),
        )
        .filter(
            models.HealthLog.user_id.in_(user_ids),
            models.HealthLog.date == today,
        )
        .group_by(models.HealthLog.user_id)
        .all()
    )

    steps_by_user = {row.user_id: int(row.steps or 0) for row in steps_rows}

    # Ensure everyone (friends + user) has an entry, default 0
    for uid in user_ids:
        steps_by_user.setdefault(uid, 0)

    # ----- Names (username or email) -----
    users = (
        db.query(models.User)
        .filter(models.User.user_id.in_(user_ids))
        .all()
    )
    name_by_id: dict[int, str] = {}
    for u in users:
        if u.username:
            name_by_id[u.user_id] = u.username
        else:
            name_by_id[u.user_id] = u.email

    # ----- Build entry list -----
    entries = []
    for uid, steps in steps_by_user.items():
        name = name_by_id.get(uid, f"User {uid}")
        entries.append(
            {
                "user_id": uid,
                "name": name,
                "steps": int(steps),
            }
        )

    # Sort by steps desc, then name as tiebreaker for stable ordering
    entries.sort(key=lambda e: (-e["steps"], e["name"]))

    # Assign ranks (1-based)
    leaderboard_entries: list[schemas.LeaderboardEntry] = []
    current_user_rank: int | None = None

    for idx, e in enumerate(entries):
        rank = idx + 1
        lb_entry = schemas.LeaderboardEntry(
            user_id=e["user_id"],
            name=e["name"],
            steps=e["steps"],
            rank=rank,
        )
        leaderboard_entries.append(lb_entry)
        if e["user_id"] == user_id:
            current_user_rank = rank

    return schemas.LeaderboardResponse(
        entries=leaderboard_entries,
        current_user_rank=current_user_rank,
        has_friends=has_friends,
    )
