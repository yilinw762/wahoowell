"""CRUD placeholder. Replace with real DB code when needed."""

from datetime import datetime
from sqlalchemy.orm import Session
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