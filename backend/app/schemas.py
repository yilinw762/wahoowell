from pydantic import BaseModel


class PingResponse(BaseModel):
    message: str
