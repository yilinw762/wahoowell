# app/api/community.py
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.core.storage import delete_post_images, upload_post_images

router = APIRouter(prefix="/api/community", tags=["community"])


@router.get("/posts", response_model=list[schemas.CommunityPostOut])
def get_posts(db: Session = Depends(get_db)):
    return crud.list_posts(db)


@router.post("/posts", response_model=schemas.CommunityPostOut, status_code=201)
async def create_post(
    user_id: int = Form(...),
    content: str = Form(...),
    visibility: str = Form("public"),
    images: list[UploadFile] | None = File(default=None),
    db: Session = Depends(get_db),
):
    uploaded = await upload_post_images(images or [])
    payload = schemas.CommunityPostCreate(
        user_id=user_id,
        content=content,
        visibility=visibility,
        images=uploaded,
    )
    return crud.create_post(db, payload)


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(post_id: int, user_id: int, db: Session = Depends(get_db)):
    stored_images = crud.list_post_images(db, post_id)
    result = crud.delete_post(db, post_id, user_id)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="Post not found")
    if result == "forbidden":
        raise HTTPException(status_code=403, detail="Not allowed to delete this post")
    delete_post_images(image.storage_path for image in stored_images)
    return {}


@router.get("/posts/{post_id}", response_model=schemas.CommunityPostOut)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.get("/posts/{post_id}/comments", response_model=list[schemas.PostCommentOut])
def get_comments(post_id: int, db: Session = Depends(get_db)):
    return crud.list_comments(db, post_id)


@router.post("/posts/{post_id}/comments", response_model=schemas.PostCommentOut, status_code=201)
def create_comment(
    post_id: int,
    comment_in: schemas.PostCommentCreate,
    db: Session = Depends(get_db),
):
    payload = comment_in.model_copy(update={"post_id": post_id})
    return crud.add_comment(db, payload)


@router.delete(
    "/posts/{post_id}/comments/{comment_id}",
    status_code=204,
)
def delete_comment(
    post_id: int,
    comment_id: int,
    user_id: int,
    db: Session = Depends(get_db),
):
    result = crud.delete_comment(db, post_id, comment_id, user_id)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="Comment not found")
    if result == "forbidden":
        raise HTTPException(status_code=403, detail="Not allowed to delete this comment")
    return {}


@router.post("/posts/{post_id}/reactions", status_code=204)
def create_reaction(
    post_id: int,
    reaction_in: schemas.PostReactionCreate,
    db: Session = Depends(get_db),
):
    payload = reaction_in.model_copy(update={"post_id": post_id})
    crud.add_reaction(db, payload)
    return {}


@router.get("/posts/{post_id}/reactions", response_model=list[schemas.ReactionSummary])
def get_reactions(post_id: int, db: Session = Depends(get_db)):
    return crud.reaction_summary(db, post_id)


@router.delete("/posts/{post_id}/reactions", status_code=204)
def delete_reaction(post_id: int, user_id: int, db: Session = Depends(get_db)):
    crud.remove_reaction(db, post_id, user_id)
    return {}


@router.get(
    "/posts/{post_id}/reactions/by-user/{user_id}",
    response_model=schemas.PostReactionOut | None,
)
def get_reaction_for_user(post_id: int, user_id: int, db: Session = Depends(get_db)):
    return crud.get_reaction_for_user(db, post_id, user_id)
