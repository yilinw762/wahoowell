from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/api/community", tags=["community"])


@router.get("/posts", response_model=list[schemas.CommunityPostOut])
def get_posts(db: Session = Depends(get_db)):
    return crud.list_posts(db)


@router.post("/posts", response_model=schemas.CommunityPostOut, status_code=201)
def create_post(post_in: schemas.CommunityPostCreate, db: Session = Depends(get_db)):
    return crud.create_post(db, post_in)


@router.get("/posts/{post_id}/comments", response_model=list[schemas.PostCommentOut])
def get_comments(post_id: int, db: Session = Depends(get_db)):
    return crud.list_comments(db, post_id)


@router.post("/posts/{post_id}/comments", response_model=schemas.PostCommentOut, status_code=201)
def create_comment(post_id: int, comment_in: schemas.PostCommentCreate, db: Session = Depends(get_db)):
    return crud.add_comment(db, comment_in)


@router.post("/posts/{post_id}/reactions", status_code=204)
def create_reaction(post_id: int, reaction_in: schemas.PostReactionCreate, db: Session = Depends(get_db)):
    crud.add_reaction(db, reaction_in)
    return {}


@router.get("/posts/{post_id}/reactions", response_model=list[schemas.ReactionSummary])
def get_reactions(post_id: int, db: Session = Depends(get_db)):
    return crud.reaction_summary(db, post_id)