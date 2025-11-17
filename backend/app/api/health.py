from fastapi import APIRouter  # type: ignore
from .. import schemas

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/ping", response_model=schemas.PingResponse)
def ping():
    """Simple health check endpoint."""
    return {"message": "pong"}
