# app/api/followers.py
from datetime import date

from fastapi import APIRouter, Depends, HTTPException  # type: ignore
from sqlalchemy.orm import Session  # type: ignore
from sqlalchemy import text

from ..database import get_db
from .. import schemas

router = APIRouter(prefix="/api/followers", tags=["followers"])


@router.post("/add", response_model=schemas.FollowerOut)
def add_follower(follower: schemas.FollowerCreate, db: Session = Depends(get_db)):
    """
    Add a follow relationship: user_id follows follower_user_id.
    Prevent self-follow and duplicates.
    """
    if follower.user_id == follower.follower_user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    existing = db.execute(
        text(
            """
            SELECT follower_id, user_id, follower_user_id, since
            FROM Followers
            WHERE user_id = :user_id AND follower_user_id = :follower_user_id
            """
        ),
        {
            "user_id": follower.user_id,
            "follower_user_id": follower.follower_user_id,
        },
    ).mappings().first()

    if existing:
        raise HTTPException(status_code=400, detail="Already following")

    result = db.execute(
        text(
            """
            INSERT INTO Followers (user_id, follower_user_id, since)
            VALUES (:user_id, :follower_user_id, NOW())
            """
        ),
        {
            "user_id": follower.user_id,
            "follower_user_id": follower.follower_user_id,
        },
    )
    follower_id = result.lastrowid

    row = db.execute(
        text(
            """
            SELECT follower_id, user_id, follower_user_id, since
            FROM Followers
            WHERE follower_id = :follower_id
            """
        ),
        {"follower_id": follower_id},
    ).mappings().first()

    return schemas.FollowerOut(**row)


@router.get("/list/{user_id}", response_model=list[schemas.FollowerOut])
def list_followers(user_id: int, db: Session = Depends(get_db)):
    """
    Return all follow relationships where this user is the 'user_id'
    (i.e., everyone they follow).
    """
    rows = db.execute(
        text(
            """
            SELECT follower_id, user_id, follower_user_id, since
            FROM Followers
            WHERE user_id = :user_id
            ORDER BY since DESC
            """
        ),
        {"user_id": user_id},
    ).mappings().all()

    return [schemas.FollowerOut(**row) for row in rows]


@router.get("/leaderboard/{user_id}", response_model=schemas.LeaderboardResponseOut)
def leaderboard(user_id: int, db: Session = Depends(get_db)):
    """
    Return today's leaderboard for the given user and everyone they follow.

    - If the user has NO followers -> entries = [], current_user_entry = None
      (friends-only view).
    """

    today = date.today()

    # 1) Who do I follow? (friends)
    follower_rows = db.execute(
        text(
            """
            SELECT follower_user_id
            FROM Followers
            WHERE user_id = :user_id
            """
        ),
        {"user_id": user_id},
    ).mappings().all()
    friend_ids = [row["follower_user_id"] for row in follower_rows]

    if not friend_ids:
        return schemas.LeaderboardResponseOut(entries=[], current_user_entry=None)

    user_ids = friend_ids  # friends only

    # Helper for IN clause
    id_params = {f"id_{i}": uid for i, uid in enumerate(user_ids)}
    placeholders = ", ".join(f":id_{i}" for i in range(len(user_ids)))

    # 3) Today's steps for each friend
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

    # 4) Get usernames (or fallback to email)
    users_sql = text(
        f"""
        SELECT user_id, COALESCE(username, email) AS username
        FROM Users
        WHERE user_id IN ({placeholders})
        """
    )
    users_rows = db.execute(users_sql, id_params).mappings().all()
    username_by_id = {row["user_id"]: row["username"] for row in users_rows}

    # 5) Build and sort entries
    raw_entries = []
    for uid in user_ids:
        raw_entries.append(
            {
                "user_id": uid,
                "username": username_by_id.get(uid, f"User {uid}"),
                "steps": steps_by_user[uid],
            }
        )

    # Sort by steps desc, then username
    raw_entries.sort(key=lambda e: (-e["steps"], e["username"]))

    entries: list[schemas.LeaderboardEntryOut] = []
    current_user_entry = None  # friends-only leaderboard

    for idx, e in enumerate(raw_entries):
        rank = idx + 1
        entry_model = schemas.LeaderboardEntryOut(
            user_id=e["user_id"],
            username=e["username"],
            steps=e["steps"],
            rank=rank,
        )
        entries.append(entry_model)

    return schemas.LeaderboardResponseOut(
        entries=entries,
        current_user_entry=current_user_entry,
    )