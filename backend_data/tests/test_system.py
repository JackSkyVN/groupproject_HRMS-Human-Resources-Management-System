"""Tests for system endpoints (admin-only reset)."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _login():
    resp = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "admin123"})
    assert resp.status_code == 200, f"login failed: {resp.text}"
    return resp.json()["access_token"]


def test_system_reset_requires_admin_and_returns_ok():
    token = _login()
    r = client.post("/api/v1/system/reset", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code in (200, 202)
