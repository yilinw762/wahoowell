from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app import schemas
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/api/followers", tags=["followers"])

class FollowAction(BaseModel):
    user_id: int
    follower_user_id: int

# --- Get suggested profiles ---
@router.get("/suggestions/{user_id}", response_model=list[schemas.ProfileWithFollowStatus])
def suggested_profiles(user_id: int, db: Session = Depends(get_db)):
    # Get current user's profile
    my_profile = db.execute(
        text("SELECT age, gender FROM Profiles WHERE user_id = :user_id"),
        {"user_id": user_id},
    ).mappings().first()
    if not my_profile:
        raise HTTPException(status_code=404, detail="User profile not found")

    # First, try to find similar users
    rows = db.execute(
        text("""
            SELECT u.user_id, u.username, u.email,
                   p.age, p.gender, p.height_cm, p.weight_kg, p.bio, p.timezone,
                   EXISTS(
                       SELECT 1 FROM Followers f
                       WHERE f.user_id = :user_id AND f.follower_user_id = u.user_id
                   ) AS is_following
            FROM Users u
            JOIN Profiles p ON u.user_id = p.user_id
            WHERE u.user_id != :user_id
              AND p.gender = :gender
              AND p.age BETWEEN :age_minus AND :age_plus
            LIMIT 5
        """),
        {
            "user_id": user_id,
            "gender": my_profile["gender"],
            "age_minus": my_profile["age"] - 5,
            "age_plus": my_profile["age"] + 5
        }
    ).mappings().all()

    # If not enough, fill with other users (excluding self and already-followed)
    if len(rows) < 2:
        extra_rows = db.execute(
            text("""
                SELECT u.user_id, u.username, u.email,
                       p.age, p.gender, p.height_cm, p.weight_kg, p.bio, p.timezone,
                       EXISTS(
                           SELECT 1 FROM Followers f
                           WHERE f.user_id = :user_id AND f.follower_user_id = u.user_id
                       ) AS is_following
                FROM Users u
                JOIN Profiles p ON u.user_id = p.user_id
                WHERE u.user_id != :user_id
                LIMIT :limit
            """),
            {"user_id": user_id, "limit": 2 - len(rows)}
        ).mappings().all()
        # Avoid duplicates
        seen_ids = {r["user_id"] for r in rows}
        rows += [r for r in extra_rows if r["user_id"] not in seen_ids]

    return [
        {
            "user_id": r["user_id"],
            "username": r["username"],
            "email": r["email"],
            "age": r["age"],
            "gender": r["gender"],
            "height_cm": r["height_cm"],
            "weight_kg": r["weight_kg"],
            "bio": r["bio"],
            "timezone": r["timezone"],
            "is_following": bool(r["is_following"])
        }
        for r in rows
    ]

# --- Follow a user ---
@router.post("/add")
def follow_user(action: FollowAction, db: Session = Depends(get_db)):
    user_id = action.user_id
    follower_user_id = action.follower_user_id
    exists = db.execute(
        text("SELECT 1 FROM Followers WHERE user_id = :user_id AND follower_user_id = :follower_user_id"),
        {"user_id": user_id, "follower_user_id": follower_user_id}
    ).first()
    if exists:
        return {"status": "already following"}

    db.execute(
        text("INSERT INTO Followers (user_id, follower_user_id, since) VALUES (:user_id, :follower_user_id, :since)"),
        {"user_id": user_id, "follower_user_id": follower_user_id, "since": datetime.utcnow()}
    )
    db.commit()
    return {"status": "followed"}

# --- Unfollow a user ---
@router.post("/unfollow")
def unfollow_user(action: FollowAction, db: Session = Depends(get_db)):
    user_id = action.user_id
    follower_user_id = action.follower_user_id
    db.execute(
        text("DELETE FROM Followers WHERE user_id = :user_id AND follower_user_id = :follower_user_id"),
        {"user_id": user_id, "follower_user_id": follower_user_id}
    )
    db.commit()
    return {"status": "unfollowed"}