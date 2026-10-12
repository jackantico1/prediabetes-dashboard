import pytest
from fastapi.testclient import TestClient

from garmin_service.app import app


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("GARMIN_SERVICE_SECRET", "s3cret")
    monkeypatch.setenv("GARMIN_FAKE", "1")
    return TestClient(app)


H = {"x-service-secret": "s3cret"}


def test_health_is_public(client):
    r = client.get("/api/py/health")
    assert r.status_code == 200
    assert r.json()["fake"] is True


def test_secret_required(client):
    assert client.post("/api/py/garmin/login", json={"email": "a@b.c", "password": "password1"}).status_code == 401
    assert client.post("/api/py/garmin/login", json={"email": "a@b.c", "password": "password1"}, headers={"x-service-secret": "nope"}).status_code == 401


def test_unconfigured_secret_is_503(monkeypatch):
    monkeypatch.delenv("GARMIN_SERVICE_SECRET", raising=False)
    monkeypatch.setenv("GARMIN_FAKE", "1")
    r = TestClient(app).post("/api/py/garmin/login", json={"email": "a@b.c", "password": "password1"}, headers=H)
    assert r.status_code == 503


def test_fake_login_and_sync(client):
    r = client.post("/api/py/garmin/login", json={"email": "jack@example.com", "password": "password1"}, headers=H)
    assert r.status_code == 200
    blob = r.json()["token_blob"]
    assert r.json()["display_name"] == "Jack"

    r = client.post("/api/py/garmin/sync", json={"token_blob": blob, "start_date": "2026-06-01", "end_date": "2026-06-07"}, headers=H)
    assert r.status_code == 200
    body = r.json()
    assert len(body["days"]) == 7
    assert body["days"][0]["date"] == "2026-06-01"
    assert body["token_blob"] == blob
    assert {"steps", "sleepHours", "hrvMs", "restingHr"} <= set(body["days"][0])


def test_fake_login_errors_map_to_codes(client):
    r = client.post("/api/py/garmin/login", json={"email": "jack@example.com", "password": "short"}, headers=H)
    assert r.status_code == 401 and r.json()["code"] == "auth_required"
    r = client.post("/api/py/garmin/login", json={"email": "jack@mfa.example", "password": "password1"}, headers=H)
    assert r.status_code == 400 and r.json()["code"] == "mfa_not_supported"


def test_sync_range_is_capped_and_validated(client):
    blob = client.post("/api/py/garmin/login", json={"email": "jack@example.com", "password": "password1"}, headers=H).json()["token_blob"]
    r = client.post("/api/py/garmin/sync", json={"token_blob": blob, "start_date": "2026-01-01", "end_date": "2026-06-07"}, headers=H)
    assert r.status_code == 200
    assert r.json()["range"]["start"] == "2026-05-08"
    assert len(r.json()["days"]) == 31
    r = client.post("/api/py/garmin/sync", json={"token_blob": blob, "start_date": "2026-06-08", "end_date": "2026-06-07"}, headers=H)
    assert r.status_code == 400
    r = client.post("/api/py/garmin/sync", json={"token_blob": "bogus", "start_date": "2026-06-01", "end_date": "2026-06-02"}, headers=H)
    assert r.status_code == 401


def test_real_backend_wraps_garmin_errors(monkeypatch):
    monkeypatch.setenv("GARMIN_SERVICE_SECRET", "s3cret")
    monkeypatch.delenv("GARMIN_FAKE", raising=False)
    from garmin_service import client as gc

    def boom(email, password):
        raise gc.MfaNotSupported("mfa")

    monkeypatch.setattr(gc, "login", boom)
    r = TestClient(app).post("/api/py/garmin/login", json={"email": "a@b.c", "password": "password1"}, headers=H)
    assert r.status_code == 400 and r.json()["code"] == "mfa_not_supported"
