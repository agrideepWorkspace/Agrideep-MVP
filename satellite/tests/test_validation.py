from __future__ import annotations

from datetime import date

import pytest

from agrideep_satellite.config import Settings
from agrideep_satellite.exceptions import (
    AreaOutOfRangeError,
    GeometryValidationError,
    ParameterValidationError,
)
from agrideep_satellite.validation import (
    validate_geometry,
    validate_monitoring_request,
)


def synthetic_polygon(offset: float = 0.0) -> dict:
    """A synthetic test shape, not an orchard location."""
    return {
        "type": "Polygon",
        "coordinates": [[
            [offset, 0],
            [offset + 0.01, 0],
            [offset + 0.01, 0.01],
            [offset, 0.01],
            [offset, 0],
        ]],
    }


def test_polygon_uses_geodesic_area_and_perimeter() -> None:
    result = validate_geometry(synthetic_polygon())

    assert 100 < result.area_ha < 130
    assert 4_000 < result.perimeter_m < 5_000
    assert result.geometry.geom_type == "Polygon"


def test_multipolygon_is_supported() -> None:
    geometry = {
        "type": "MultiPolygon",
        "coordinates": [
            synthetic_polygon(0)["coordinates"],
            synthetic_polygon(0.02)["coordinates"],
        ],
    }

    result = validate_geometry(geometry)

    assert result.geometry.geom_type == "MultiPolygon"
    assert 200 < result.area_ha < 260


def test_unclosed_ring_is_rejected_before_geometry_repair() -> None:
    geometry = synthetic_polygon()
    geometry["coordinates"][0].pop()

    with pytest.raises(GeometryValidationError, match="must be closed"):
        validate_geometry(geometry)


def test_self_intersection_and_unsupported_crs_are_rejected() -> None:
    bow_tie = {
        "type": "Polygon",
        "coordinates": [[
            [0, 0],
            [0.01, 0.01],
            [0, 0.01],
            [0.01, 0],
            [0, 0],
        ]],
    }
    with pytest.raises(GeometryValidationError, match="invalid"):
        validate_geometry(bow_tie)

    declared_projected = {
        **synthetic_polygon(),
        "crs": {"type": "name", "properties": {"name": "EPSG:3857"}},
    }
    with pytest.raises(GeometryValidationError, match="WGS84"):
        validate_geometry(declared_projected)


def test_area_and_coordinate_limits_are_enforced() -> None:
    with pytest.raises(AreaOutOfRangeError):
        validate_geometry(synthetic_polygon(), max_area_ha=50)

    outside_wgs84 = synthetic_polygon()
    outside_wgs84["coordinates"][0][1][0] = 181
    with pytest.raises(GeometryValidationError, match="WGS84"):
        validate_geometry(outside_wgs84)

    boolean_coordinate = synthetic_polygon()
    boolean_coordinate["coordinates"][0][1][0] = True
    with pytest.raises(GeometryValidationError, match="numeric"):
        validate_geometry(boolean_coordinate)


def test_monitoring_dates_and_cloud_threshold_are_validated() -> None:
    settings = Settings(max_period_months=1)
    request = validate_monitoring_request(
        synthetic_polygon(),
        "2020-03-01",
        "2020-04-01",
        15,
        settings=settings,
        today=date(2020, 5, 1),
    )
    assert request.max_cloud_pct == 15
    assert request.end_date == date(2020, 4, 1)

    with pytest.raises(ParameterValidationError, match="earlier"):
        validate_monitoring_request(
            synthetic_polygon(),
            "2020-04-01",
            "2020-04-01",
            settings=settings,
            today=date(2020, 5, 1),
        )
    with pytest.raises(ParameterValidationError, match="future"):
        validate_monitoring_request(
            synthetic_polygon(),
            "2020-04-01",
            "2020-05-02",
            settings=settings,
            today=date(2020, 5, 1),
        )
    with pytest.raises(ParameterValidationError, match="0 to 100"):
        validate_monitoring_request(
            synthetic_polygon(),
            "2020-03-01",
            "2020-04-01",
            101,
            settings=settings,
            today=date(2020, 5, 1),
        )


def test_period_limit_and_strict_date_format() -> None:
    with pytest.raises(ParameterValidationError, match="cannot exceed"):
        validate_monitoring_request(
            synthetic_polygon(),
            "2020-01-31",
            "2020-03-01",
            settings=Settings(max_period_months=1),
            today=date(2020, 4, 1),
        )
    with pytest.raises(ParameterValidationError, match="YYYY-MM-DD"):
        validate_monitoring_request(
            synthetic_polygon(),
            "2020-3-01",
            "2020-04-01",
            today=date(2020, 5, 1),
        )
