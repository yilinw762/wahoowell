import logging
import os
from fastapi import APIRouter, Depends, HTTPException, Request # type: ignore
from sqlalchemy.orm import Session # type: ignore
from .. import crud, schemas, models
import bcrypt # type: ignore
from ..database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])

logger = logging.getLogger("wahoowell.users")
logging.basicConfig(level=logging.DEBUG)

@router.post("/register", response_model=schemas.User)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = bcrypt.hashpw(user_in.password.encode("utf-8"), bcrypt.gensalt())
    user = models.User(
        email=user_in.email,
        username=user_in.username,
        password_hash=hashed_pw.decode("utf-8"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login")
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not bcrypt.checkpw(user_in.password.encode("utf-8"), user.password_hash.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Login successful", "user_id": user.user_id, "username": user.username}

@router.post("/upsert", response_model=schemas.User)
async def upsert_user(request: Request, payload: schemas.UserCreate, db: Session = Depends(get_db)):
    # debug info
    try:
        logger.info("UPsert request payload: %s", payload.dict())
        logger.info("Running against DATABASE_URL=%s", os.getenv("DATABASE_URL"))
        user = crud.upsert_user(db, payload)
        user.username = payload.username  # ensure username is set in response
        logger.info("Upsert OK user_id=%s email=%s", getattr(user, "user_id", None), getattr(user, "email", None))
        return user
    except Exception as e:
        # log full stack trace
        logger.exception("Upsert failed")
        # return details in response for local debugging only
        raise HTTPException(status_code=500, detail={"error": str(e), "type": type(e).__name__})

@router.get("/by-email")
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user_id": user.user_id}