"""Tests for attendance endpoints (list and export)."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _login():
    resp = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "admin123"})
    assert resp.status_code == 200, f"login failed: {resp.text}"
    return resp.json()["access_token"]


def test_attendance_list_ok():
    token = _login()
    r = client.get("/api/v1/attendance?limit=5", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "count" in data


def test_attendance_export_ok(tmp_path):
    token = _login()
    r = client.get("/api/v1/attendance/export", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    ct = r.headers.get("content-type", "")
    if "application/json" in ct:
        meta = r.json()
        assert "path" in meta
    else:
        # Binary XLSX response
        assert (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in ct
            or "application/octet-stream" in ct
            or "application/vnd.ms-excel" in ct
        )
        assert isinstance(r.content, (bytes, bytearray))
        assert len(r.content) > 100
