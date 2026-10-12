from garmin_service.normalize import has_data, normalize_body_composition, normalize_daily_health, parse_local_date


def test_daily_health_maps_summary_sleep_and_hrv():
    summary = {"totalSteps": 8421, "restingHeartRate": 58, "averageStressLevel": 31, "bodyBatteryHighestValue": 88, "bodyBatteryLowestValue": 12, "totalKilocalories": 2410, "moderateIntensityMinutes": 20, "vigorousIntensityMinutes": 10, "activeSeconds": 3600}
    sleep = {"dailySleepDTO": {"sleepTimeSeconds": 7 * 3600 + 1800, "deepSleepSeconds": 5400, "remSleepSeconds": 6300, "lightSleepSeconds": 14400, "awakeSleepSeconds": 900, "sleepScores": {"overall": {"value": 82}}}}
    hrv = {"hrvSummary": {"lastNightAvg": 44}}
    r = normalize_daily_health("2026-06-01", summary, sleep, hrv)
    assert r["date"] == "2026-06-01"
    assert r["steps"] == 8421
    assert r["activeMinutes"] == 60
    assert r["intensityMinutes"] == 40
    assert r["restingHr"] == 58
    assert r["sleepHours"] == 7.5
    assert r["deepHours"] == 1.5
    assert r["sleepScore"] == 82
    assert r["hrvMs"] == 44
    assert has_data(r)


def test_daily_health_tolerates_missing_everything():
    r = normalize_daily_health("2026-06-01", None, None, None)
    assert r["date"] == "2026-06-01"
    assert not has_data(r)
    assert r["sleepHours"] is None


def test_negative_stress_means_no_data():
    r = normalize_daily_health("2026-06-01", {"averageStressLevel": -1}, None, None)
    assert r["avgStress"] is None


def test_body_composition_converts_grams_to_pounds_and_dedupes_days():
    raw = {"dateWeightList": [
        {"calendarDate": "2026-06-01", "weight": 90000, "bodyFat": 24.5, "muscleMass": 40000, "bmi": 27.1},
        {"calendarDate": "2026-06-01", "weight": 89500, "bodyFat": 24.2},
        {"calendarDate": "2026-05-30", "weight": None},
    ]}
    rows = normalize_body_composition(raw)
    assert len(rows) == 1
    assert rows[0]["date"] == "2026-06-01"
    assert rows[0]["weightLbs"] == 197.3
    assert rows[0]["bodyFatPct"] == 24.2


def test_parse_local_date_formats():
    assert parse_local_date("2026-06-01 07:30:00") == "2026-06-01"
    assert parse_local_date("2026-06-01T07:30:00.000") == "2026-06-01"
    assert parse_local_date("2026-06-01") == "2026-06-01"
    assert parse_local_date(None) is None
