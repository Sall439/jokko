from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import pytest
from django.utils import timezone

from apps.core.utils import (
    as_business_local,
    business_timezone,
    cancellation_window,
    combine_local,
    end_of_local_day,
    ensure_aware,
    format_xof,
    iter_days,
    local_date,
    local_now,
    min_lead_time,
    now,
    parse_xof,
    slot_granularity,
    start_of_local_day,
)


def test_business_timezone_is_africa_dakar() -> None:
    assert str(business_timezone()) == "Africa/Dakar"


def test_format_xof() -> None:
    assert format_xof(15000) == "15 000 FCFA"
    assert format_xof(0) == "0 FCFA"


@pytest.mark.parametrize(
    "value,expected",
    [(15000, 15000), ("15000", 15000), (15000.9, 15000), ("15000.75", 15000)],
)
def test_parse_xof_valid(value: object, expected: int) -> None:
    assert parse_xof(value) == expected


@pytest.mark.parametrize("value", ["abc", None, True, [], ""])
def test_parse_xof_invalid(value: object) -> None:
    with pytest.raises(ValueError):
        parse_xof(value)


def test_datetime_helpers_return_aware_values() -> None:
    assert timezone.is_aware(now())
    assert timezone.is_aware(local_now())

    naive = datetime(2026, 3, 2, 9, 0)
    aware = ensure_aware(naive)
    assert timezone.is_aware(aware)
    assert aware.utcoffset() == timedelta(0)
    # Une valeur déjà aware n'est pas modifiée.
    assert ensure_aware(aware) is aware


def test_as_business_local_converts_utc_to_dakar() -> None:
    utc_value = datetime(2026, 3, 2, 12, 0, tzinfo=ZoneInfo("UTC"))
    local_value = as_business_local(utc_value)
    assert local_value.hour == 12
    assert str(local_value.tzinfo) == "Africa/Dakar"


def test_local_date_handles_datetime_and_date() -> None:
    assert local_date(date(2026, 3, 2)) == date(2026, 3, 2)
    moment = datetime(2026, 3, 2, 23, 30, tzinfo=ZoneInfo("UTC"))
    assert local_date(moment) == date(2026, 3, 2)


def test_day_boundaries_are_aware() -> None:
    day = date(2026, 3, 2)
    start = start_of_local_day(day)
    end = end_of_local_day(day)
    assert timezone.is_aware(start)
    assert timezone.is_aware(end)
    assert start.hour == 0 and start.minute == 0
    assert end.hour == 23 and end.minute == 59
    assert combine_local(day, time(9, 30)).hour == 9


def test_iter_days() -> None:
    assert iter_days(date(2026, 3, 2), date(2026, 3, 4)) == [
        date(2026, 3, 2),
        date(2026, 3, 3),
        date(2026, 3, 4),
    ]
    assert iter_days(date(2026, 3, 4), date(2026, 3, 2)) == []
    assert len(iter_days(date(2026, 3, 2), date(2026, 3, 2))) == 1


def test_settings_backed_durations(settings: object) -> None:
    assert cancellation_window() == timedelta(hours=24)
    assert slot_granularity() == timedelta(minutes=30)
    assert min_lead_time() == timedelta(minutes=60)

    settings.APPOINTMENT_CANCELLATION_WINDOW_HOURS = 48  # type: ignore[attr-defined]
    settings.APPOINTMENT_SLOT_GRANULARITY_MINUTES = 0  # type: ignore[attr-defined]
    settings.APPOINTMENT_MIN_LEAD_MINUTES = 0  # type: ignore[attr-defined]
    assert cancellation_window() == timedelta(hours=48)
    # Une granularité incohérente est ramenée à un minimum de 5 minutes.
    assert slot_granularity() == timedelta(minutes=5)
    assert min_lead_time() == timedelta(0)
