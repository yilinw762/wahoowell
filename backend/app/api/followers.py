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

@router.delete("/remove", status_code=204)
def remove_follower(user_id: int, follower_user_id: int, db: Session = Depends(get_db)):
    follower = db.query(models.Follower).filter_by(
        user_id=user_id, follower_user_id=follower_user_id
    ).first()
    if not follower:
        raise HTTPException(status_code=404, detail="Not following")
    db.delete(follower)
    db.commit()