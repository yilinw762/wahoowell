from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("/upsert", response_model=schemas.User)
def upsert_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        user = crud.upsert_user(db, payload)
        return user
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))