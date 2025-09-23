FastAPI backend for Wahoowell

Quick start

1. Create and activate a virtual environment (Windows PowerShell):

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Run the app:

```powershell
uvicorn backend.app.main:app --reload --port 8000
```

3. Health check: `GET http://localhost:8000/api/health/ping`

Next steps

- Add a database (SQLAlchemy / Tortoise / or ORM of choice)
- Add authentication (JWT / OAuth)
- Add more routers and tests
