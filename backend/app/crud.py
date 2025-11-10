"""CRUD placeholder. Replace with real DB code when needed."""

from datetime import datetime
from sqlalchemy.orm import Session
from . import models, schemas


def get_status():
    return {"status": "ok"}


def upsert_user(db: Session, user_in: schemas.UserCreate):
    if not user_in.email:
        raise ValueError("email is required")

    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    password = user_in.password_hash or ""

    if user:
        if password and password != user.password_hash:
            user.password_hash = password
        db.commit()
        db.refresh(user)
        return user

    new_user = models.User(
        email=user_in.email,
        password_hash=password,
        created_at=datetime.utcnow(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
