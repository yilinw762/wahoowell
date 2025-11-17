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
    # 1) Check if email already exists
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

    # 2) Hash password
    if not user_in.password:
        raise HTTPException(status_code=400, detail="Password is required")

    hashed_pw = bcrypt.hashpw(user_in.password.encode("utf-8"), bcrypt.gensalt())
    username = user_in.username or user_in.email.split("@")[0]

    # 3) Insert user
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
            "password_hash": hashed_pw.decode("utf-8"),
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
async def upsert_user(
    request: Request, payload: schemas.UserCreate, db: Session = Depends(get_db)
):
    """
    Upsert endpoint used e.g. by external login.
    Delegates to crud.upsert_user (now raw SQL).
    """
    try:
        logger.info("Upsert request payload: %s", payload.dict())
        logger.info("Running against DATABASE_URL=%s", os.getenv("DATABASE_URL"))

        user = crud.upsert_user(db, payload)
        # Ensure username in response matches what we just passed in (if provided)
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

@router.post("/login", response_model=schemas.User)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    row = db.execute(
        text("""
            SELECT user_id, email, username, password_hash, created_at
            FROM Users
            WHERE email = :email
        """),
        {"email": user_in.email},
    ).mappings().first()

    if not row or not row["password_hash"]:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not bcrypt.checkpw(user_in.password.encode("utf-8"), row["password_hash"].encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return schemas.User(
        user_id=row["user_id"],
        email=row["email"],
        username=row["username"],
        created_at=row["created_at"],
    )