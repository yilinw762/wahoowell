from fastapi import APIRouter
from .. import schemas

router = APIRouter()


@router.get("/ping", response_model=schemas.PingResponse)
def ping():
    """Simple health check endpoint."""
    return {"message": "pong"}
