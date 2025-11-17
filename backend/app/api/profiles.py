from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/api/profiles", tags=["profiles"])

@router.post("/auto-create", response_model=schemas.ProfileOut)
def auto_create_profile(user_id: int, db: Session = Depends(get_db)):
    crud.create_profile(db, user_id)
    row = crud.get_profile(db, user_id)
    return schemas.ProfileOut(**row)

@router.get("/{user_id}", response_model=schemas.ProfileOut)
def get_profile(user_id: int, db: Session = Depends(get_db)):
    row = crud.get_profile(db, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")
    return schemas.ProfileOut(**row)

@router.put("/{user_id}", response_model=schemas.ProfileOut)
def update_profile(user_id: int, profile_in: schemas.ProfileUpdate, db: Session = Depends(get_db)):
    # Try to get the profile first
    row = crud.get_profile(db, user_id)
    if not row:
        # Auto-create profile if not found
        crud.create_profile(db, user_id)
    # Now update
    crud.update_profile(db, user_id, profile_in)
    row = crud.get_profile(db, user_id)
    if not row:
        raise HTTPException(status_code=500, detail="Profile could not be created")
    return schemas.ProfileOut(**row)