"""Turn raw Garmin JSON into the compact daily records the dashboard stores.

Ported from garmin-chat (backend/app/normalize.py). Every accessor is defensive:
Garmin's payload shape varies by device and account, and a missing key must
produce None rather than a 500.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

POUNDS_PER_GRAM = 0.00220462262


def _f(value: Any) -> float | None:
    if value is None:
        return None
    try:
        out = float(value)
    except (TypeError, ValueError):
        return None
    if out != out:  # NaN
        return None
    return out


def _i(value: Any) -> int | None:
    out = _f(value)
    return None if out is None else int(round(out))


def _round(value: float | None, digits: int = 2) -> float | None:
    return None if value is None else round(value, digits)


def parse_local_date(raw: Any) -> str | None:
    """Garmin returns 'YYYY-MM-DD HH:MM:SS' (local) or an ISO timestamp."""
    if not raw:
        return None
    text = str(raw)
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(text[:26], fmt).date().isoformat()
        except ValueError:
            continue
    try:
        return date.fromisoformat(text[:10]).isoformat()
    except ValueError:
        return None


def normalize_daily_health(
    day: str,
    summary: dict[str, Any] | None,
    sleep: dict[str, Any] | None,
    hrv: dict[str, Any] | None,
) -> dict[str, Any]:
    """One day of health metrics from up to three Garmin endpoints.

    Keys match the dashboard's `daily_health` columns (camelCase). Missing
    metrics are null so the database upsert keeps any previously stored value.
    """
    summary = summary or {}
    moderate = _i(summary.get("moderateIntensityMinutes"))
    vigorous = _i(summary.get("vigorousIntensityMinutes"))
    intensity = None if moderate is None and vigorous is None else (moderate or 0) + 2 * (vigorous or 0)
    active_seconds = _f(summary.get("activeSeconds")) or _f(summary.get("highlyActiveSeconds"))
    record: dict[str, Any] = {
        "date": day,
        "steps": _i(summary.get("totalSteps")),
        "activeMinutes": None if active_seconds is None else int(round(active_seconds / 60)),
        "intensityMinutes": intensity,
        "restingHr": _i(summary.get("restingHeartRate")),
        "avgStress": _i(summary.get("averageStressLevel")),
        "bodyBatteryHigh": _i(summary.get("bodyBatteryHighestValue")),
        "bodyBatteryLow": _i(summary.get("bodyBatteryLowestValue")),
        "calories": _i(summary.get("totalKilocalories")),
        "sleepHours": None,
        "deepHours": None,
        "remHours": None,
        "lightHours": None,
        "awakeHours": None,
        "sleepScore": None,
        "hrvMs": None,
    }
    # Garmin reports -1 for stress when there is no data.
    if record["avgStress"] is not None and record["avgStress"] < 0:
        record["avgStress"] = None

    sleep_dto = (sleep or {}).get("dailySleepDTO") or {}
    total_sleep = _f(sleep_dto.get("sleepTimeSeconds"))
    if total_sleep:
        record["sleepHours"] = _round(total_sleep / 3600.0, 1)
        record["deepHours"] = _round((_f(sleep_dto.get("deepSleepSeconds")) or 0) / 3600.0, 1)
        record["remHours"] = _round((_f(sleep_dto.get("remSleepSeconds")) or 0) / 3600.0, 1)
        record["lightHours"] = _round((_f(sleep_dto.get("lightSleepSeconds")) or 0) / 3600.0, 1)
        record["awakeHours"] = _round((_f(sleep_dto.get("awakeSleepSeconds")) or 0) / 3600.0, 1)
        scores = sleep_dto.get("sleepScores") or {}
        overall = scores.get("overall") if isinstance(scores, dict) else None
        if isinstance(overall, dict):
            record["sleepScore"] = _i(overall.get("value"))

    hrv_summary = (hrv or {}).get("hrvSummary") or {}
    if hrv_summary:
        record["hrvMs"] = _i(hrv_summary.get("lastNightAvg"))

    return record


def has_data(record: dict[str, Any]) -> bool:
    return any(v is not None for k, v in record.items() if k != "date")


def normalize_body_composition(raw: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Weight entries in pounds, one per calendar day (Garmin's grams -> lbs)."""
    entries = (raw or {}).get("dateWeightList") or []
    records: list[dict[str, Any]] = []
    for entry in entries:
        grams = _f(entry.get("weight"))
        if grams is None:
            continue
        muscle = _f(entry.get("muscleMass"))
        records.append(
            {
                "date": parse_local_date(entry.get("calendarDate")) or entry.get("calendarDate"),
                "weightLbs": _round(grams * POUNDS_PER_GRAM, 1),
                "bodyFatPct": _round(_f(entry.get("bodyFat")), 1),
                "muscleMassLbs": None if muscle is None else _round(muscle * POUNDS_PER_GRAM, 1),
                "bmi": _round(_f(entry.get("bmi")), 1),
            }
        )
    # Keep the last entry per day.
    by_date: dict[str, dict[str, Any]] = {}
    for r in records:
        if r["date"]:
            by_date[r["date"]] = r
    return sorted(by_date.values(), key=lambda r: r["date"])
