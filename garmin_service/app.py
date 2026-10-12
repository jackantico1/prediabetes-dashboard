"""FastAPI app exposing two stateless Garmin operations to the Next.js server.

    POST /api/py/garmin/login  {email, password}            -> {token_blob, display_name}
    POST /api/py/garmin/sync   {token_blob, start_date, end_date} -> {days, body, token_blob}

Every request must carry `X-Service-Secret` matching GARMIN_SERVICE_SECRET.
Nothing is persisted here; the caller stores the (encrypted) token blob.
"""

from __future__ import annotations

import asyncio
import hmac
import logging
import os
from datetime import date, timedelta

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import client, fake

log = logging.getLogger("garmin_service")
logging.basicConfig(level=logging.INFO)

MAX_RANGE_DAYS = 31
PREFIX = "/api/py"

app = FastAPI(title="Garmin sync service", docs_url=None, redoc_url=None, openapi_url=None)


def use_fake() -> bool:
    return os.environ.get("GARMIN_FAKE", "") in {"1", "true", "yes"}


def require_secret(x_service_secret: str | None = Header(default=None)) -> None:
    expected = os.environ.get("GARMIN_SERVICE_SECRET", "")
    if not expected:
        raise HTTPException(status_code=503, detail={"code": "not_configured", "message": "GARMIN_SERVICE_SECRET is not set on the Garmin service."})
    if not x_service_secret or not hmac.compare_digest(x_service_secret, expected):
        raise HTTPException(status_code=401, detail={"code": "forbidden", "message": "Bad service secret."})


@app.exception_handler(client.GarminError)
async def garmin_error_handler(_request, exc: client.GarminError) -> JSONResponse:  # type: ignore[no-untyped-def]
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message})


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=256)


class LoginResponse(BaseModel):
    token_blob: str
    display_name: str | None = None


class SyncRequest(BaseModel):
    token_blob: str = Field(min_length=1)
    start_date: date
    end_date: date


@app.get(f"{PREFIX}/health")
def health() -> dict[str, object]:
    return {"ok": True, "fake": use_fake(), "configured": bool(os.environ.get("GARMIN_SERVICE_SECRET"))}


@app.post(f"{PREFIX}/garmin/login", response_model=LoginResponse, dependencies=[Depends(require_secret)])
async def login(payload: LoginRequest) -> LoginResponse:
    if use_fake():
        blob, name = fake.login(payload.email, payload.password)
    else:
        # Blocking HTTP inside garminconnect; keep it off the event loop.
        blob, name = await asyncio.to_thread(client.login, payload.email, payload.password)
    return LoginResponse(token_blob=blob, display_name=name)


@app.post(f"{PREFIX}/garmin/sync", dependencies=[Depends(require_secret)])
async def sync(payload: SyncRequest) -> dict[str, object]:
    start, end = payload.start_date, payload.end_date
    if end < start:
        raise HTTPException(status_code=400, detail={"code": "bad_range", "message": "end_date is before start_date"})
    if (end - start).days + 1 > MAX_RANGE_DAYS:
        start = end - timedelta(days=MAX_RANGE_DAYS - 1)

    if use_fake():
        result = fake.sync_range(payload.token_blob, start, end)
        return {**result, "token_blob": payload.token_blob, "range": {"start": start.isoformat(), "end": end.isoformat()}}

    def run() -> tuple[dict[str, object], str]:
        garmin = client.load(payload.token_blob)
        result = client.sync_range(garmin, start, end)
        return result, garmin.client.dumps()

    result, refreshed = await asyncio.to_thread(run)
    return {**result, "token_blob": refreshed, "range": {"start": start.isoformat(), "end": end.isoformat()}}
