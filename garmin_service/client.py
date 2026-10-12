"""Garmin Connect access: login, token round-trip, rate-limited calls.

Ported from garmin-chat's garmin_client.py, minus the database. This service is
stateless: the caller (the Next.js server) keeps the encrypted token blob and
sends it with every request. Passwords are used once, in memory, to mint
tokens and are never stored or logged.

MFA is not supported: completing Garmin's MFA flow needs the same live client
across two requests, which a serverless deployment cannot guarantee.
"""

from __future__ import annotations

import logging
import random
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from typing import Any, Callable

from garminconnect import (
    Garmin,
    GarminConnectAuthenticationError,
    GarminConnectConnectionError,
    GarminConnectTooManyRequestsError,
)

from .normalize import has_data, normalize_body_composition, normalize_daily_health

log = logging.getLogger(__name__)

MFA_REQUIRED = "needs_mfa"
MAX_ATTEMPTS = 3
CONCURRENCY = 4


class GarminError(Exception):
    code = "garmin_error"
    status = 502

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class AuthRequired(GarminError):
    code = "auth_required"
    status = 401


class MfaNotSupported(GarminError):
    code = "mfa_not_supported"
    status = 400


class RateLimited(GarminError):
    code = "rate_limited"
    status = 429


class Unreachable(GarminError):
    code = "garmin_unreachable"
    status = 502


def login(email: str, password: str) -> tuple[str, str | None]:
    """Sign in and return (token_blob, display_name)."""
    garmin = Garmin(email=email, password=password, return_on_mfa=True)
    try:
        status, _state = garmin.login()
    except GarminConnectAuthenticationError as exc:
        raise AuthRequired("Garmin rejected that email or password.") from exc
    except GarminConnectTooManyRequestsError as exc:
        raise RateLimited("Garmin is rate limiting sign-ins right now. Try again in a few minutes.") from exc
    except GarminConnectConnectionError as exc:
        raise Unreachable("Couldn't reach Garmin Connect. Try again shortly.") from exc
    if status == MFA_REQUIRED:
        raise MfaNotSupported(
            "This Garmin account has two-factor authentication enabled, which isn't supported. "
            "You can turn MFA off in Garmin Connect settings, or skip Garmin for now."
        )
    name = getattr(garmin, "full_name", None) or getattr(garmin, "display_name", None)
    return garmin.client.dumps(), name


def load(token_blob: str) -> Garmin:
    garmin = Garmin()
    try:
        garmin.login(tokenstore=token_blob)
    except (GarminConnectAuthenticationError, GarminConnectConnectionError) as exc:
        raise AuthRequired("Garmin no longer accepts the saved connection. Please connect again.") from exc
    return garmin


def call(fn: Callable[..., Any], *args: Any) -> Any:
    """Invoke a blocking Garmin method with backoff on transient failures."""
    last: Exception | None = None
    for attempt in range(MAX_ATTEMPTS):
        try:
            return fn(*args)
        except GarminConnectTooManyRequestsError as exc:
            last = exc
            if attempt == MAX_ATTEMPTS - 1:
                raise RateLimited("Garmin is rate limiting this account. Wait a few minutes and sync again.") from exc
        except GarminConnectAuthenticationError as exc:
            raise AuthRequired("Garmin no longer accepts the saved connection. Please connect again.") from exc
        except GarminConnectConnectionError as exc:
            last = exc
            if attempt == MAX_ATTEMPTS - 1:
                raise Unreachable("Couldn't reach Garmin Connect. Try again shortly.") from exc
        time.sleep(min(8.0, 2**attempt) * (0.5 + random.random() / 2))
    assert last is not None
    raise last


def fetch_day(garmin: Garmin, day: date) -> dict[str, Any]:
    day_str = day.isoformat()

    def maybe(fn: Callable[..., Any]) -> Any:
        try:
            return call(fn, day_str)
        except (AuthRequired, RateLimited):
            raise
        except Exception as exc:  # a single missing day must not fail the range
            log.debug("fetch failed for %s: %s", day_str, exc)
            return None

    summary = maybe(garmin.get_user_summary)
    sleep = maybe(garmin.get_sleep_data)
    hrv = maybe(garmin.get_hrv_data)
    return normalize_daily_health(day_str, summary, sleep, hrv)


def sync_range(garmin: Garmin, start: date, end: date) -> dict[str, Any]:
    days = [start + timedelta(days=i) for i in range((end - start).days + 1)]
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        rows = list(pool.map(lambda d: fetch_day(garmin, d), days))
    populated = [r for r in rows if has_data(r)]

    body: list[dict[str, Any]] = []
    try:
        raw = call(garmin.get_body_composition, start.isoformat(), end.isoformat())
        body = normalize_body_composition(raw)
    except (AuthRequired, RateLimited):
        raise
    except Exception as exc:
        log.debug("body composition fetch failed: %s", exc)

    return {"days": populated, "body": body, "requested_days": len(days)}
