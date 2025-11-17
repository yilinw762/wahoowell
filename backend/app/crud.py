from datetime import datetime
from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore

from . import schemas


def get_status():
    return {"status": "ok"}


# -------- USERS --------

def upsert_user(db: Session, user_in: schemas.UserCreate) -> schemas.User:
    """
    Upsert user by email.
    - If user exists, update username (and optionally other fields).
    - If not, insert new user.
    Return a schemas.User object.
    """
    if not user_in.email:
        raise ValueError("email is required")

    username = user_in.username or getattr(user_in, "name", None)

    # 1) Look up by email
    row = db.execute(
        text(
            """
            SELECT user_id, email, username, created_at
            FROM Users
            WHERE email = :email
            """
        ),
        {"email": user_in.email},
    ).mappings().first()

    # If exists → update username if provided
    if row:
        if username and row["username"] != username:
            db.execute(
                text(
                    """
                    UPDATE Users
                    SET username = :username
                    WHERE user_id = :user_id
                    """
                ),
                {"username": username, "user_id": row["user_id"]},
            )
            row["username"] = username

        return schemas.User(**row)

    # If not exists → insert
    result = db.execute(
        text(
            """
            INSERT INTO Users (email, username, password_hash)
            VALUES (:email, :username, :password_hash)
            """
        ),
        {
            "email": user_in.email,
            "username": username,
            # if your UserCreate has no password, this can be an empty string
            "password_hash": getattr(user_in, "password_hash", "") or "",
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


# -------- COMMUNITY POSTS / COMMENTS / REACTIONS --------

def list_posts(db: Session) -> list[schemas.CommunityPostOut]:
    """
    Return all community posts ordered by newest first.
    """
    rows = db.execute(
        text(
            """
            SELECT
                post_id,
                user_id,
                content,
                visibility,
                created_at
            FROM CommunityPosts
            ORDER BY created_at DESC
            """
        )
    ).mappings().all()

    return [schemas.CommunityPostOut(**row) for row in rows]


def create_post(db: Session, post_in: schemas.CommunityPostCreate) -> schemas.CommunityPostOut:
    """
    Insert a new community post and return it.
    """
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
            SELECT
                post_id,
                user_id,
                content,
                visibility,
                created_at
            FROM CommunityPosts
            WHERE post_id = :post_id
            """
        ),
        {"post_id": post_id},
    ).mappings().first()

    return schemas.CommunityPostOut(**row)


def add_comment(db: Session, comment_in: schemas.PostCommentCreate) -> schemas.PostCommentOut:
    """
    Insert a new comment on a post and return it.
    """
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
            SELECT
                comment_id,
                post_id,
                user_id,
                content,
                created_at
            FROM PostComments
            WHERE comment_id = :comment_id
            """
        ),
        {"comment_id": comment_id},
    ).mappings().first()

    return schemas.PostCommentOut(**row)


def add_reaction(db: Session, reaction_in: schemas.PostReactionCreate) -> None:
    """
    Insert a reaction (like, etc.) for a post.
    (If you enforce uniqueness on (post_id,user_id,reaction_type) in DB,
     duplicates will error at DB level.)
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
    """
    Return counts of each reaction type for a given post.
    """
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