import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Request  # type: ignore
from sqlalchemy.orm import Session  # type: ignore
from sqlalchemy import text
import bcrypt  # type: ignore

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])

logger = logging.getLogger("wahoowell.users")
logging.basicConfig(level=logging.DEBUG)


@router.post("/register", response_model=schemas.User)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    existing = db.execute(
        text(
            """
            SELECT user_id, email, username, created_at
            FROM Users
            WHERE email = :email
            """
        ),
        {"email": user_in.email},
    ).mappings().first()

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    username = user_in.username or user_in.email.split("@")[0]

    if not getattr(user_in, "password", None):
        raise HTTPException(status_code=400, detail="Password is required")

    password_hash = bcrypt.hashpw(
        user_in.password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    result = db.execute(
        text(
            """
            INSERT INTO Users (email, username, password_hash)
            VALUES (:email, :username, :password_hash)
            """
        ),
        {
            "email": user_in.email,
            "username": username,
            "password_hash": password_hash,
        },
    )
    user_id = result.lastrowid

    row = db.execute(
        text(
            """
            SELECT user_id, email, username, created_at
            FROM Users
            WHERE user_id = :user_id
            """
        ),
        {"user_id": user_id},
    ).mappings().first()

    return schemas.User(**row)


@router.post("/upsert", response_model=schemas.User)
async def upsert_user(request: Request, payload: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        logger.info("Upsert request payload: %s", payload.dict())
        logger.info("Running against DB_URL=%s", os.getenv("SQLALCHEMY_DATABASE_URL"))

        user = crud.upsert_user(db, payload)
        # Ensure username in response matches what we just passed in (if set)
        if payload.username:
            user.username = payload.username

        logger.info(
            "Upsert OK user_id=%s email=%s",
            getattr(user, "user_id", None),
            getattr(user, "email", None),
        )
        return user
    except Exception as e:
        logger.exception("Upsert failed")
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "type": type(e).__name__},
        )