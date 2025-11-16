"""CRUD placeholder. Replace with real DB code when needed."""

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas

def get_status():
    return {"status": "ok"}

def upsert_user(db: Session, user_in: schemas.UserCreate):
    if not user_in.email:
        raise ValueError("email is required")

    # use name as username if username is not provided
    username = user_in.username or getattr(user_in, "name", None)

    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    password = user_in.password_hash or ""

    if user:
        # update username if provided and changed
        if username and user.username != username:
            user.username = username
        # update password if provided and changed
        if password and password != user.password_hash:
            user.password_hash = password
        db.commit()
        db.refresh(user)
        return user

    new_user = models.User(
        email=user_in.email,
        username=username,
        password_hash=password,
        created_at=datetime.utcnow(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def create_post(db: Session, post_in: schemas.CommunityPostCreate) -> models.CommunityPost:
    post = models.CommunityPost(**post_in.model_dump())
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def list_posts(db: Session) -> list[models.CommunityPost]:
    return (
        db.query(models.CommunityPost)
        .order_by(models.CommunityPost.created_at.desc())
        .all()
    )


def add_comment(db: Session, comment_in: schemas.PostCommentCreate) -> models.PostComment:
    comment = models.PostComment(**comment_in.model_dump())
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def add_reaction(db: Session, reaction_in: schemas.PostReactionCreate) -> models.PostReaction:
    reaction = models.PostReaction(**reaction_in.model_dump())
    db.merge(reaction)
    db.commit()
    return reaction


def list_comments(db: Session, post_id: int) -> list[models.PostComment]:
    return (
        db.query(models.PostComment)
        .filter(models.PostComment.post_id == post_id)
        .order_by(models.PostComment.created_at.asc())
        .all()
    )


def reaction_summary(db: Session, post_id: int) -> list[schemas.ReactionSummary]:
    rows = (
        db.query(
            models.PostReaction.post_id,
            models.PostReaction.reaction_type,
            func.count().label("count"),
        )
        .filter(models.PostReaction.post_id == post_id)
        .group_by(models.PostReaction.post_id, models.PostReaction.reaction_type)
        .all()
    )
    return [schemas.ReactionSummary(**row._asdict()) for row in rows]