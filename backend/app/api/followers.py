from fastapi import APIRouter, Depends, HTTPException # type: ignore
from sqlalchemy.orm import Session # type: ignore
from ..database import get_db
from .. import models, schemas

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

@router.get("/following_profiles/{user_id}", response_model=list[schemas.ProfileOut])
def get_following_profiles(user_id: int, db: Session = Depends(get_db)):
    followed_ids = db.query(models.Follower.follower_user_id).filter(models.Follower.user_id == user_id)
    profiles = db.query(models.Profile).filter(models.Profile.user_id.in_(followed_ids)).all()
    return profiles