import logging
import os
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])

logger = logging.getLogger("wahoowell.users")
logging.basicConfig(level=logging.DEBUG)


@router.post("/upsert", response_model=schemas.User)
async def upsert_user(request: Request, payload: schemas.UserCreate, db: Session = Depends(get_db)):
    # debug info
    try:
        logger.info("UPsert request payload: %s", payload.dict())
        logger.info("Running against DATABASE_URL=%s", os.getenv("DATABASE_URL"))
        user = crud.upsert_user(db, payload)
        logger.info("Upsert OK user_id=%s email=%s", getattr(user, "user_id", None), getattr(user, "email", None))
        return user
    except Exception as e:
        # log full stack trace
        logger.exception("Upsert failed")
        # return details in response for local debugging only
        raise HTTPException(status_code=500, detail={"error": str(e), "type": type(e).__name__})