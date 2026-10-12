"""A fake Garmin backend for local development and tests (GARMIN_FAKE=1).

Returns deterministic, plausible data without touching Garmin. Any email with
a password of at least 8 characters signs in; the token blob is a marker string.
"""

from __future__ import annotations

import hashlib
from datetime import date, timedelta
from typing import Any

FAKE_BLOB_PREFIX = "fake-garmin-token:"


def login(email: str, password: str) -> tuple[str, str | None]:
    from .client import AuthRequired, MfaNotSupported

    if email.endswith("@mfa.example"):
        raise MfaNotSupported("This Garmin account has two-factor authentication enabled, which isn't supported.")
    if len(password) < 8:
        raise AuthRequired("Garmin rejected that email or password.")
    return FAKE_BLOB_PREFIX + email, email.split("@")[0].title()


def _seeded(day: date, salt: str) -> float:
    h = hashlib.sha256(f"{day.isoformat()}:{salt}".encode()).digest()
    return int.from_bytes(h[:4], "big") / 2**32


def sync_range(token_blob: str, start: date, end: date) -> dict[str, Any]:
    from .client import AuthRequired

    if not token_blob.startswith(FAKE_BLOB_PREFIX):
        raise AuthRequired("Garmin no longer accepts the saved connection. Please connect again.")
    days = []
    body = []
    d = start
    while d <= end:
        r = lambda salt: _seeded(d, salt)  # noqa: E731
        poor = r("sleep") < 0.3
        sleep = round((5.2 + r("s2")) if poor else (6.8 + 1.4 * r("s2")), 1)
        days.append(
            {
                "date": d.isoformat(),
                "steps": int(3000 + 8000 * r("steps")),
                "activeMinutes": int(10 + 60 * r("active")),
                "intensityMinutes": int(50 * r("int")),
                "restingHr": int(56 + 10 * r("rhr")),
                "avgStress": int(20 + 35 * r("stress")),
                "bodyBatteryHigh": int(60 + 38 * r("bb")),
                "bodyBatteryLow": int(5 + 25 * r("bbl")),
                "calories": int(2000 + 700 * r("cal")),
                "sleepHours": sleep,
                "deepHours": round(sleep * 0.17, 1),
                "remHours": round(sleep * 0.21, 1),
                "lightHours": round(sleep * 0.55, 1),
                "awakeHours": round(0.2 + 0.4 * r("awake"), 1),
                "sleepScore": int(50 + 45 * r("score")),
                "hrvMs": int(30 + 25 * r("hrv")),
            }
        )
        if r("weigh") < 0.5:
            body.append({"date": d.isoformat(), "weightLbs": round(190 - (d - start).days * 0.05 + r("w"), 1), "bodyFatPct": round(26 + r("bf"), 1), "muscleMassLbs": None, "bmi": None})
        d += timedelta(days=1)
    return {"days": days, "body": body, "requested_days": len(days)}
