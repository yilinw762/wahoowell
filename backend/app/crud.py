# app/crud.py
"""CRUD layer using raw SQL (no ORM models)."""

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

from . import schemas


def get_status():
    return {"status": "ok"}


# ---------- USERS ----------

def upsert_user(db: Session, user_in: schemas.UserCreate) -> schemas.User:
    """
    Upsert a user by email.
    - If exists: update username/password_hash if they changed.
    - If not: insert.
    Mirrors the old ORM behavior but in raw SQL.
    """
    if not user_in.email:
        raise ValueError("email is required")

    username = (
        (user_in.username or getattr(user_in, "name", None) or "")
        .strip()
        or user_in.email.split("@")[0]
    )
    password = (
        getattr(user_in, "password_hash", "")
        or getattr(user_in, "password", "")
        or ""
    )

    # 1) Fetch existing by email
    row = db.execute(
        text(
            """
            SELECT user_id, email, username, password_hash, created_at
            FROM Users
            WHERE email = :email
            """
        ),
        {"email": user_in.email},
    ).mappings().first()

    # 2) Update path
    if row:
        updates = []
        params = {"user_id": row["user_id"]}

        if username and row["username"] != username:
            updates.append("username = :username")
            params["username"] = username

        if password and row["password_hash"] != password:
            updates.append("password_hash = :password_hash")
            params["password_hash"] = password

        if updates:
            sql = f"""
                UPDATE Users
                SET {", ".join(updates)}
                WHERE user_id = :user_id
            """
            db.execute(text(sql), params)
            db.commit()

        # Return fresh copy
        updated = db.execute(
            text(
                """
                SELECT user_id, email, username, created_at
                FROM Users
                WHERE user_id = :user_id
                """
            ),
            {"user_id": row["user_id"]},
        ).mappings().first()

        return schemas.User(**updated)

    # 3) Insert path
    result = db.execute(
        text(
            """
            INSERT INTO Users (email, username, password_hash, created_at)
            VALUES (:email, :username, :password_hash, :created_at)
            """
        ),
        {
            "email": user_in.email,
            "username": username,
            "password_hash": password,
            "created_at": datetime.utcnow(),
        },
    )
    user_id = result.lastrowid
    db.commit()

    new_row = db.execute(
        text(
            """
            SELECT user_id, email, username, created_at
            FROM Users
            WHERE user_id = :user_id
            """
        ),
        {"user_id": user_id},
    ).mappings().first()

    return schemas.User(**new_row)


# ---------- COMMUNITY / POSTS ----------

def create_post(db: Session, post_in: schemas.CommunityPostCreate) -> schemas.CommunityPostOut:
    now = datetime.utcnow()
    result = db.execute(
        text(
            """
            INSERT INTO CommunityPosts (user_id, content, visibility, created_at)
            VALUES (:user_id, :content, :visibility, :created_at)
            """
        ),
        {
            "user_id": post_in.user_id,
            "content": post_in.content,
            "visibility": post_in.visibility,
            "created_at": now,
        },
    )
    db.commit()
    post_id = result.lastrowid

    row = db.execute(
        text(
            """
            SELECT cp.post_id,
                   cp.user_id,
                   u.username,
                   cp.content,
                   cp.visibility,
                   cp.created_at
            FROM CommunityPosts AS cp
            LEFT JOIN Users AS u ON u.user_id = cp.user_id
            WHERE cp.post_id = :post_id
            """
        ),
        {"post_id": post_id},
    ).mappings().first()

    return schemas.CommunityPostOut(**row)


def list_posts(db: Session) -> list[schemas.CommunityPostOut]:
    rows = db.execute(
        text(
            """
            SELECT cp.post_id,
                   cp.user_id,
                   u.username,
                   cp.content,
                   cp.visibility,
                   cp.created_at
            FROM CommunityPosts AS cp
            LEFT JOIN Users AS u ON u.user_id = cp.user_id
            ORDER BY cp.created_at DESC
            """
        )
    ).mappings().all()
    return [schemas.CommunityPostOut(**row) for row in rows]


def get_post(db: Session, post_id: int) -> schemas.CommunityPostOut | None:
    row = db.execute(
        text(
            """
            SELECT cp.post_id,
                   cp.user_id,
                   u.username,
                   cp.content,
                   cp.visibility,
                   cp.created_at
            FROM CommunityPosts AS cp
            LEFT JOIN Users AS u ON u.user_id = cp.user_id
            WHERE cp.post_id = :post_id
            """
        ),
        {"post_id": post_id},
    ).mappings().first()

    return schemas.CommunityPostOut(**row) if row else None


def add_comment(db: Session, comment_in: schemas.PostCommentCreate) -> schemas.PostCommentOut:
    now = datetime.utcnow()
    result = db.execute(
        text(
            """
            INSERT INTO PostComments (post_id, user_id, content, created_at)
            VALUES (:post_id, :user_id, :content, :created_at)
            """
        ),
        {
            "post_id": comment_in.post_id,
            "user_id": comment_in.user_id,
            "content": comment_in.content,
            "created_at": now,
        },
    )
    db.commit()
    comment_id = result.lastrowid

    row = db.execute(
        text(
            """
            SELECT pc.comment_id,
                   pc.post_id,
                   pc.user_id,
                   u.username,
                   pc.content,
                   pc.created_at
            FROM PostComments AS pc
            LEFT JOIN Users AS u ON u.user_id = pc.user_id
            WHERE pc.comment_id = :comment_id
            """
        ),
        {"comment_id": comment_id},
    ).mappings().first()

    return schemas.PostCommentOut(**row)


def list_comments(db: Session, post_id: int) -> list[schemas.PostCommentOut]:
    rows = db.execute(
        text(
            """
            SELECT pc.comment_id,
                   pc.post_id,
                   pc.user_id,
                   u.username,
                   pc.content,
                   pc.created_at
            FROM PostComments AS pc
            LEFT JOIN Users AS u ON u.user_id = pc.user_id
            WHERE pc.post_id = :post_id
            ORDER BY pc.created_at ASC
            """
        ),
        {"post_id": post_id},
    ).mappings().all()

    return [schemas.PostCommentOut(**row) for row in rows]


def delete_post(db: Session, post_id: int, user_id: int) -> str:
    owner = db.execute(
        text(
            """
            SELECT user_id
            FROM CommunityPosts
            WHERE post_id = :post_id
            """
        ),
        {"post_id": post_id},
    ).mappings().first()

    if not owner:
        return "not_found"
    if owner["user_id"] != user_id:
        return "forbidden"

    db.execute(
        text("DELETE FROM PostComments WHERE post_id = :post_id"),
        {"post_id": post_id},
    )
    db.execute(
        text("DELETE FROM PostReactions WHERE post_id = :post_id"),
        {"post_id": post_id},
    )
    db.execute(
        text("DELETE FROM CommunityPosts WHERE post_id = :post_id"),
        {"post_id": post_id},
    )
    db.commit()
    return "deleted"


def delete_comment(db: Session, post_id: int, comment_id: int, user_id: int) -> str:
    comment = db.execute(
        text(
            """
            SELECT post_id, user_id
            FROM PostComments
            WHERE comment_id = :comment_id
            """
        ),
        {"comment_id": comment_id},
    ).mappings().first()

    if not comment or comment["post_id"] != post_id:
        return "not_found"
    if comment["user_id"] != user_id:
        return "forbidden"

    db.execute(
        text("DELETE FROM PostComments WHERE comment_id = :comment_id"),
        {"comment_id": comment_id},
    )
    db.commit()
    return "deleted"


def add_reaction(db: Session, reaction_in: schemas.PostReactionCreate):
    """
    Upsert-style behavior: remove existing reaction from this user, then insert the new one.
    """
    now = datetime.utcnow()
    db.execute(
        text(
            """
            DELETE FROM PostReactions
            WHERE post_id = :post_id AND user_id = :user_id
            """
        ),
        {
            "post_id": reaction_in.post_id,
            "user_id": reaction_in.user_id,
        },
    )

    db.execute(
        text(
            """
            INSERT INTO PostReactions (post_id, user_id, reaction_type, created_at)
            VALUES (:post_id, :user_id, :reaction_type, :created_at)
            """
        ),
        {
            "post_id": reaction_in.post_id,
            "user_id": reaction_in.user_id,
            "reaction_type": reaction_in.reaction_type,
            "created_at": now,
        },
    )
    db.commit()


def remove_reaction(db: Session, post_id: int, user_id: int):
    db.execute(
        text(
            """
            DELETE FROM PostReactions
            WHERE post_id = :post_id AND user_id = :user_id
            """
        ),
        {"post_id": post_id, "user_id": user_id},
    )
    db.commit()


def get_reaction_for_user(db: Session, post_id: int, user_id: int):
    row = db.execute(
        text(
            """
            SELECT post_id, user_id, reaction_type, created_at
            FROM PostReactions
            WHERE post_id = :post_id AND user_id = :user_id
            """
        ),
        {"post_id": post_id, "user_id": user_id},
    ).mappings().first()

    return schemas.PostReactionOut(**row) if row else None


def reaction_summary(db: Session, post_id: int) -> list[schemas.ReactionSummary]:
    rows = db.execute(
        text(
            """
            SELECT
                post_id,
                reaction_type,
                COUNT(*) AS count
            FROM PostReactions
            WHERE post_id = :post_id
            GROUP BY post_id, reaction_type
            """
        ),
        {"post_id": post_id},
    ).mappings().all()

    return [schemas.ReactionSummary(**row) for row in rows]

def create_profile(db: Session, user_id: int):
    db.execute(
        text("""
            INSERT INTO Profiles (user_id)
            VALUES (:user_id)
            ON DUPLICATE KEY UPDATE user_id = user_id
        """),
        {"user_id": user_id}
    )
    db.commit()

def get_profile(db: Session, user_id: int):
    row = db.execute(
        text("SELECT * FROM Profiles WHERE user_id = :user_id"),
        {"user_id": user_id}
    ).mappings().first()
    return row

def update_profile(db: Session, user_id: int, profile_in: schemas.ProfileUpdate):
    db.execute(
        text("""
            UPDATE Profiles
            SET age = :age, gender = :gender, height_cm = :height_cm,
                weight_kg = :weight_kg, timezone = :timezone, bio = :bio
            WHERE user_id = :user_id
        """),
        {
            "user_id": user_id,
            "age": profile_in.age,
            "gender": profile_in.gender,
            "height_cm": profile_in.height_cm,
            "weight_kg": profile_in.weight_kg,
            "timezone": profile_in.timezone,
            "bio": profile_in.bio,
        }
    )
    db.commit()