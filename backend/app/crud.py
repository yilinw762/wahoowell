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

    username = user_in.username or getattr(user_in, "name", None)
    password = getattr(user_in, "password_hash", "") or ""

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


def add_reaction(db: Session, reaction_in: schemas.PostReactionCreate):
    """
    Old ORM code used merge() with a uniqueness constraint.
    Here we just INSERT; if you kept the unique index, duplicates will error at DB level.
    """
    now = datetime.utcnow()
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
