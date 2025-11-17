# app/api/leaderboard.py
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app import schemas

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("/{user_id}", response_model=schemas.LeaderboardResponse)
def get_leaderboard(user_id: int, db: Session = Depends(get_db)):
    """
    Returns today's leaderboard for the user and the users they follow.

    - If a friend has no health log for today => steps = 0.
    - Sorted by steps desc, then name.
    """

    today = date.today()

    # 1) Who do I follow? (Followers.user_id = me, follower_user_id = friend)
    follow_rows = db.execute(
        text(
            """
            SELECT follower_user_id
            FROM Followers
            WHERE user_id = :user_id
            """
        ),
        {"user_id": user_id},
    ).mappings().all()
    friend_ids = [row["follower_user_id"] for row in follow_rows]

    has_friends = len(friend_ids) > 0

    # 2) Build the set of users in the leaderboard: me + my friends
    user_ids = [user_id] + friend_ids
    user_ids = list(dict.fromkeys(user_ids))  # dedupe, preserve order

    if not user_ids:
        return schemas.LeaderboardResponse(
            entries=[], current_user_rank=None, has_friends=False
        )

    # Helper to build IN clause safely
    id_params = {f"id_{i}": uid for i, uid in enumerate(user_ids)}
    placeholders = ", ".join(f":id_{i}" for i in range(len(user_ids)))

    # 3) Get today's steps
    steps_sql = text(
        f"""
        SELECT user_id, COALESCE(SUM(steps), 0) AS steps
        FROM HealthLogs
        WHERE user_id IN ({placeholders})
          AND date = :today
        GROUP BY user_id
        """
    )
    steps_params = dict(id_params)
    steps_params["today"] = today
    steps_rows = db.execute(steps_sql, steps_params).mappings().all()

    steps_by_user = {row["user_id"]: int(row["steps"] or 0) for row in steps_rows}
    for uid in user_ids:
        steps_by_user.setdefault(uid, 0)

    # 4) Get display names (username or email)
    users_sql = text(
        f"""
        SELECT user_id, COALESCE(username, email) AS name
        FROM Users
        WHERE user_id IN ({placeholders})
        """
    )
    users_rows = db.execute(users_sql, id_params).mappings().all()
    name_by_id = {row["user_id"]: row["name"] for row in users_rows}

    # 5) Build and sort entries
    raw_entries = [
        {
            "user_id": uid,
            "name": name_by_id.get(uid, f"User {uid}"),
            "steps": steps_by_user[uid],
        }
        for uid in user_ids
    ]

    raw_entries.sort(key=lambda e: (-e["steps"], e["name"]))

    leaderboard_entries: list[schemas.LeaderboardEntry] = []
    current_user_rank = None

    for idx, e in enumerate(raw_entries):
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