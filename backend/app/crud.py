"""CRUD placeholder. Replace with real DB code when needed."""

from sqlalchemy.orm import Session
from . import models, schemas
from datetime import datetime


def get_status():
    return {"status": "ok"}


def upsert_user(db: Session, user_in: schemas.UserCreate):
    # try find by providerAccountId first, then by email
    user = None
    if user_in.provider and user_in.providerAccountId:
        user = db.query(models.User).filter(
            models.User.provider == user_in.provider,
            models.User.provider_account_id == user_in.providerAccountId,
        ).first()
    if not user and user_in.email:
        user = db.query(models.User).filter(models.User.email == user_in.email).first()

    if user:
        user.name = user_in.name or user.name
        user.image = user_in.image or user.image
        user.provider = user_in.provider or user.provider
        user.provider_account_id = user_in.providerAccountId or user.provider_account_id
        user.updated_at = datetime.utcnow()
    else:
        user = models.User(
            email=user_in.email,
            name=user_in.name,
            image=user_in.image,
            provider=user_in.provider,
            provider_account_id=user_in.providerAccountId,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(user)
    db.commit()
    db.refresh(user)
    return user
