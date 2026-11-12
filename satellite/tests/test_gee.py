from __future__ import annotations

from datetime import date
from pathlib import Path
from types import SimpleNamespace

import pytest

from agrideep_satellite.authentication import create_earth_engine_credentials
from agrideep_satellite.config import Settings
from agrideep_satellite.exceptions import EarthEngineAuthenticationError
from agrideep_satellite.gee.cloud_masking import mask_sentinel2_clouds
from agrideep_satellite.gee.initialization import initialize_earth_engine
from agrideep_satellite.gee.sentinel2 import (
    SENTINEL2_COLLECTION,
    build_collection,
)
from agrideep_satellite.validation import validate_monitoring_request


class FakeMask:
    def __init__(self, exclusions: list[int] | None = None) -> None:
        self.exclusions = exclusions or []

    def neq(self, class_value: int) -> FakeMask:
        return FakeMask([*self.exclusions, class_value])

    def And(self, other: FakeMask) -> FakeMask:
        return FakeMask([*self.exclusions, *other.exclusions])


class FakeImage:
    def __init__(self) -> None:
        self.applied_mask: FakeMask | None = None

    def select(self, band: str) -> FakeMask:
        assert band == "SCL"
        return FakeMask()

    def updateMask(self, mask: FakeMask) -> FakeImage:
        self.applied_mask = mask
        return self


def test_scl_mask_excludes_documented_classes() -> None:
    image = FakeImage()

    masked = mask_sentinel2_clouds(image, ee_module=object())

    assert masked is image
    assert image.applied_mask is not None
    assert image.applied_mask.exclusions == [0, 1, 3, 7, 8, 9, 10, 11]


def test_earth_engine_initialization_uses_mocked_application_credentials() -> None:
    calls: list[dict] = []
    deadlines: list[float] = []
    fake_ee = SimpleNamespace(
        Initialize=lambda **kwargs: calls.append(kwargs),
        ServiceAccountCredentials=lambda email, key_file: (email, key_file),
        data=SimpleNamespace(
            setDeadline=lambda milliseconds: deadlines.append(milliseconds)
        ),
        ee_exception=SimpleNamespace(EEException=RuntimeError),
    )
    settings = Settings(ee_project="test-project", request_timeout_seconds=45)

    initialized = initialize_earth_engine(settings, ee_module=fake_ee)

    assert initialized is fake_ee
    assert calls == [{"credentials": "persistent", "project": "test-project"}]
    assert deadlines == [45_000]
    assert create_earth_engine_credentials(settings, fake_ee) is None


def test_service_account_requires_both_account_and_key_file() -> None:
    settings = Settings(
        ee_project="test-project",
        ee_service_account="service@example.invalid",
    )
    fake_ee = SimpleNamespace(
        Initialize=lambda **kwargs: None,
        ee_exception=SimpleNamespace(EEException=RuntimeError),
    )

    with pytest.raises(EarthEngineAuthenticationError, match="both"):
        initialize_earth_engine(settings, ee_module=fake_ee)


def test_ee_initialization_failure_is_an_actionable_auth_error() -> None:
    class FakeEEException(Exception):
        pass

    def fail_initialize(**kwargs: object) -> None:
        raise FakeEEException("authentication rejected")

    fake_ee = SimpleNamespace(
        Initialize=fail_initialize,
        ee_exception=SimpleNamespace(EEException=FakeEEException),
    )

    with pytest.raises(EarthEngineAuthenticationError, match="authentication failed"):
        initialize_earth_engine(Settings(ee_project="test-project"), ee_module=fake_ee)


def test_collection_filter_uses_boundary_dates_and_scene_cloud_threshold() -> None:
    calls: list[tuple] = []

    class FakeCollection:
        def filterBounds(self, geometry: object) -> FakeCollection:
            calls.append(("bounds", geometry))
            return self

        def filterDate(self, start: str, end: str) -> FakeCollection:
            calls.append(("date", start, end))
            return self

        def filter(self, value: object) -> FakeCollection:
            calls.append(("filter", value))
            return self

        def sort(self, value: str) -> FakeCollection:
            calls.append(("sort", value))
            return self

    collection = FakeCollection()
    fake_ee = SimpleNamespace(
        Geometry=lambda geometry: ("geometry", geometry),
        ImageCollection=lambda name: (calls.append(("collection", name)) or collection),
        Filter=SimpleNamespace(lte=lambda name, value: ("lte", name, value)),
    )
    boundary = {
        "type": "Polygon",
        "coordinates": [[
            [0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0],
        ]],
    }
    request = validate_monitoring_request(
        boundary,
        date(2020, 3, 1),
        date(2020, 3, 31),
        20,
        settings=Settings(),
        today=date(2020, 4, 1),
    )

    result, geometry = build_collection(
        request, Settings(), ee_module=fake_ee
    )

    assert result is collection
    assert geometry == ("geometry", boundary)
    assert ("collection", SENTINEL2_COLLECTION) in calls
    assert ("date", "2020-03-01", "2020-04-01") in calls
    assert ("filter", ("lte", "CLOUDY_PIXEL_PERCENTAGE", 20.0)) in calls
