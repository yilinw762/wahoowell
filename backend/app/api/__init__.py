from fastapi import APIRouter

router = APIRouter()

from . import health

router.include_router(health.router, prefix="/health")
