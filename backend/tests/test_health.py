from pathlib import Path
import sys

from fastapi.testclient import TestClient

try:
    from backend.app.main import app
except ModuleNotFoundError:  # running from inside backend package
    backend_root = Path(__file__).resolve().parents[1]
    if str(backend_root) not in sys.path:
        sys.path.append(str(backend_root))
    from app.main import app


def test_ping():
    client = TestClient(app)
    r = client.get("/api/health/ping")
    assert r.status_code == 200
    assert r.json() == {"message": "pong"}
