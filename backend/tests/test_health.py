from fastapi.testclient import TestClient
from backend.app.main import app


def test_ping():
    client = TestClient(app)
    r = client.get("/api/health/ping")
    assert r.status_code == 200
    assert r.json() == {"message": "pong"}
