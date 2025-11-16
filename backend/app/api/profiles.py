from fastapi import APIRouter, Depends # type: ignore
from sqlalchemy.orm import Session # type: ignore
from ..database import get_db
from .. import models, schemas
import random

router = APIRouter(prefix="/api/profiles", tags=["profiles"])

@router.get("/suggested/{user_id}", response_model=list[schemas.ProfileOut])
def suggested_profiles(user_id: int, db: Session = Depends(get_db), limit: int = 5):
    # Exclude self and already-followed users
    followed = db.query(models.Follower.follower_user_id).filter(models.Follower.user_id == user_id)
    q = db.query(models.Profile).filter(
        models.Profile.user_id != user_id,
        ~models.Profile.user_id.in_(followed)
    )
    profiles = q.all()
    # Shuffle and return up to `limit` profiles
    random.shuffle(profiles)
    return profiles[:limit]