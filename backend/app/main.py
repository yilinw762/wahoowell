from fastapi import FastAPI
from .api import router as api_router


def create_app() -> FastAPI:
    app = FastAPI(title="Wahoowell API", version="0.1.0")
    app.include_router(api_router, prefix="/api")
    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
