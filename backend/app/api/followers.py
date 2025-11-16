from fastapi import APIRouter, Depends, HTTPException # type: ignore
from sqlalchemy.orm import Session # type: ignore
from ..database import get_db
from .. import models, schemas
from datetime import date
from sqlalchemy import func

router = APIRouter(prefix="/api/followers", tags=["followers"])

@router.post("/add", response_model=schemas.FollowerOut)
def add_follower(follower: schemas.FollowerCreate, db: Session = Depends(get_db)):
    if follower.user_id == follower.follower_user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    existing = db.query(models.Follower).filter_by(
        user_id=follower.user_id, follower_user_id=follower.follower_user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already following")
    new_follower = models.Follower(
        user_id=follower.user_id,
        follower_user_id=follower.follower_user_id
    )
    db.add(new_follower)
    db.commit()
    db.refresh(new_follower)
    return new_follower

@router.get("/list/{user_id}", response_model=list[schemas.FollowerOut])
def list_followers(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Follower).filter_by(user_id=user_id).all()
@router.get("/leaderboard/{user_id}", response_model=schemas.LeaderboardResponseOut)
def leaderboard(user_id: int, db: Session = Depends(get_db)):
    """
    Return today's leaderboard for the given user and everyone they follow.

    - If the user has NO followers -> entries = [], current_user_entry = None
      (frontend will show "No friends yet").
    - If a friend has no HealthLog for today -> steps = 0.
    """

    today = date.today()

    # 1) Who do I follow?
    follower_rows = (
        db.query(models.Follower)
        .filter(models.Follower.user_id == user_id)
        .all()
    )
    friend_ids = [row.follower_user_id for row in follower_rows]

    # If no friends at all -> return empty leaderboard
    if not friend_ids:
        return schemas.LeaderboardResponseOut(entries=[], current_user_entry=None)

    # 2) Build the user set: only friends (no need to include myself
    #    since the spec says "friends leaderboard")
    user_ids = friend_ids

    # 3) Get today's steps for each friend
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
    # default to 0 if no record
    for uid in user_ids:
        steps_by_user.setdefault(uid, 0)

    # 4) Get names (username or email)
    users = (
        db.query(models.User)
        .filter(models.User.user_id.in_(user_ids))
        .all()
    )
    username_by_id = {
        u.user_id: (u.username or u.email) for u in users
    }

    # 5) Build and sort entries
    raw_entries = []
    for uid, steps in steps_by_user.items():
        raw_entries.append(
            {
                "user_id": uid,
                "username": username_by_id.get(uid, f"User {uid}"),
                "steps": steps,
            }
        )

    # Sort by steps desc, then name
    raw_entries.sort(key=lambda e: (-e["steps"], e["username"]))

    entries: list[schemas.LeaderboardEntryOut] = []
    current_user_entry = None  # you only want friends, so this stays None

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