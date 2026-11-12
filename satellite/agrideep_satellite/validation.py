"""GeoJSON and monitoring-parameter validation."""

from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from pyproj import Geod
from shapely.errors import GEOSException
from shapely.geometry import MultiPolygon, Polygon, shape
from shapely.geometry.base import BaseGeometry
from shapely.geometry.polygon import orient
from shapely.validation import explain_validity

from .config import Settings
from .exceptions import (
    AreaOutOfRangeError,
    GeometryValidationError,
    ParameterValidationError,
)

_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_GEOD = Geod(ellps="WGS84")


@dataclass(frozen=True)
class ValidatedGeometry:
    """Validated WGS84 orchard boundary and geodesic measurements."""

    geometry: BaseGeometry
    geojson: dict[str, Any]
    area_ha: float
    perimeter_m: float


@dataclass(frozen=True)
class MonitoringRequest:
    """Validated inputs required for one monitoring run."""

    boundary: ValidatedGeometry
    start_date: date
    end_date: date
    max_cloud_pct: float


def _extract_geometry(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise GeometryValidationError("Orchard boundary must be a GeoJSON object.")

    crs = value.get("crs")
    if crs is not None:
        crs_name = (
            crs.get("properties", {}).get("name", "")
            if isinstance(crs, dict)
            else ""
        )
        normalized_crs = str(crs_name).upper()
        if not any(
            marker in normalized_crs
            for marker in ("EPSG:4326", "CRS84", "CRS:84")
        ):
            raise GeometryValidationError(
                "Orchard coordinates must use WGS84 (EPSG:4326), "
                "in [longitude, latitude] order."
            )

    if value.get("type") == "Feature":
        geometry = value.get("geometry")
    else:
        geometry = value
    if not isinstance(geometry, dict):
        raise GeometryValidationError("GeoJSON Feature must contain a geometry.")

    return geometry


def _validate_coordinate_dimensions(geometry: Polygon | MultiPolygon) -> None:
    polygons = [geometry] if isinstance(geometry, Polygon) else list(geometry.geoms)
    for polygon in polygons:
        rings = [polygon.exterior, *polygon.interiors]
        for ring in rings:
            for coordinate in ring.coords:
                if len(coordinate) != 2:
                    raise GeometryValidationError(
                        "Orchard boundary coordinates must be two-dimensional "
                        "[longitude, latitude] pairs."
                    )
                longitude, latitude = coordinate
                if (
                    isinstance(longitude, bool)
                    or isinstance(latitude, bool)
                    or not isinstance(longitude, (int, float))
                    or not isinstance(latitude, (int, float))
                ):
                    raise GeometryValidationError(
                        "Orchard coordinates must be numeric longitude/latitude pairs."
                    )
                if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
                    raise GeometryValidationError(
                        "Orchard coordinates are outside WGS84 longitude/latitude "
                        "bounds."
                    )
                if not math.isfinite(longitude) or not math.isfinite(latitude):
                    raise GeometryValidationError(
                        "Orchard boundary coordinates must be finite numbers."
                    )


def _validate_raw_rings(geometry_json: dict[str, Any]) -> None:
    coordinates = geometry_json.get("coordinates")
    if not isinstance(coordinates, (list, tuple)):
        raise GeometryValidationError("GeoJSON coordinates must be an array.")
    polygons = [coordinates] if geometry_json["type"] == "Polygon" else coordinates
    for polygon in polygons:
        if not isinstance(polygon, (list, tuple)) or not polygon:
            raise GeometryValidationError(
                "Each orchard polygon must contain at least one linear ring."
            )
        for ring in polygon:
            if not isinstance(ring, (list, tuple)) or len(ring) < 4:
                raise GeometryValidationError(
                    "Each polygon ring must have at least four coordinates, "
                    "including its closing coordinate."
                )
            if ring[0] != ring[-1]:
                raise GeometryValidationError("Polygon rings must be closed.")
            for coordinate in ring:
                if not isinstance(coordinate, (list, tuple)) or len(coordinate) != 2:
                    raise GeometryValidationError(
                        "Orchard boundary coordinates must be two-dimensional "
                        "[longitude, latitude] pairs."
                    )
                longitude, latitude = coordinate
                if (
                    isinstance(longitude, bool)
                    or isinstance(latitude, bool)
                    or not isinstance(longitude, (int, float))
                    or not isinstance(latitude, (int, float))
                ):
                    raise GeometryValidationError(
                        "Orchard coordinates must be numeric longitude/latitude pairs."
                    )
                if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
                    raise GeometryValidationError(
                        "Orchard coordinates are outside WGS84 longitude/latitude "
                        "bounds."
                    )
                if not math.isfinite(longitude) or not math.isfinite(latitude):
                    raise GeometryValidationError(
                        "Orchard boundary coordinates must be finite numbers."
                    )


def _geodesic_measurements(geometry: Polygon | MultiPolygon) -> tuple[float, float]:
    polygons = [geometry] if isinstance(geometry, Polygon) else list(geometry.geoms)
    signed_area = 0.0
    perimeter = 0.0
    for polygon in polygons:
        polygon_area, polygon_perimeter = _GEOD.geometry_area_perimeter(
            orient(polygon, sign=1.0)
        )
        signed_area += abs(polygon_area)
        perimeter += polygon_perimeter
    return signed_area / 10_000, perimeter


def validate_geometry(
    value: Any,
    *,
    min_area_ha: float = 0.1,
    max_area_ha: float = 500.0,
) -> ValidatedGeometry:
    """Validate a GeoJSON Polygon/MultiPolygon and calculate geodesic area."""
    geometry_json = _extract_geometry(value)
    geometry_type = geometry_json.get("type")
    if geometry_type not in {"Polygon", "MultiPolygon"}:
        raise GeometryValidationError(
            "Orchard boundary must be a GeoJSON Polygon or MultiPolygon."
        )
    _validate_raw_rings(geometry_json)

    try:
        geometry = shape(geometry_json)
    except (GEOSException, IndexError, TypeError, ValueError) as exc:
        raise GeometryValidationError(f"Invalid GeoJSON geometry: {exc}") from exc
    if not isinstance(geometry, (Polygon, MultiPolygon)) or geometry.is_empty:
        raise GeometryValidationError("Orchard boundary must not be empty.")
    _validate_coordinate_dimensions(geometry)
    if not geometry.is_valid:
        raise GeometryValidationError(
            f"Orchard boundary is invalid: {explain_validity(geometry)}."
        )

    area_ha, perimeter_m = _geodesic_measurements(geometry)
    if area_ha < min_area_ha or area_ha > max_area_ha:
        raise AreaOutOfRangeError(
            f"Orchard area {area_ha:.2f} ha is outside the configured "
            f"{min_area_ha:.2f}–{max_area_ha:.2f} ha range."
        )

    normalized_geometry = json.loads(json.dumps(geometry_json))
    return ValidatedGeometry(
        geometry=geometry,
        geojson=normalized_geometry,
        area_ha=area_ha,
        perimeter_m=perimeter_m,
    )


def _parse_date(value: str | date, field_name: str) -> date:
    if isinstance(value, datetime):
        raise ParameterValidationError(f"{field_name} must be a date, not a timestamp.")
    if isinstance(value, date):
        return value
    if not isinstance(value, str) or not _DATE_PATTERN.fullmatch(value):
        raise ParameterValidationError(f"{field_name} must use YYYY-MM-DD.")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ParameterValidationError(
            f"{field_name} is not a valid calendar date."
        ) from exc


def _add_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    from calendar import monthrange

    return date(year, month, min(value.day, monthrange(year, month)[1]))


def validate_monitoring_request(
    geometry: Any,
    start_date: str | date,
    end_date: str | date,
    max_cloud_pct: float | None = None,
    *,
    settings: Settings | None = None,
    today: date | None = None,
) -> MonitoringRequest:
    """Validate the boundary and dates before any Earth Engine request."""
    config = settings or Settings()
    boundary = validate_geometry(
        geometry,
        min_area_ha=config.min_area_ha,
        max_area_ha=config.max_area_ha,
    )
    start = _parse_date(start_date, "start_date")
    end = _parse_date(end_date, "end_date")
    current_date = today or date.today()

    if start >= end:
        raise ParameterValidationError("start_date must be earlier than end_date.")
    if end > current_date:
        raise ParameterValidationError("end_date cannot be in the future.")
    if start < config.earliest_date:
        raise ParameterValidationError(
            f"start_date cannot be earlier than {config.earliest_date.isoformat()}."
        )
    if end > _add_months(start, config.max_period_months):
        raise ParameterValidationError(
            f"Monitoring period cannot exceed {config.max_period_months} months."
        )

    cloud_pct = (
        config.default_max_cloud_pct
        if max_cloud_pct is None
        else max_cloud_pct
    )
    if isinstance(cloud_pct, bool) or not isinstance(cloud_pct, (int, float)):
        raise ParameterValidationError("max_cloud_pct must be a number from 0 to 100.")
    if not math.isfinite(cloud_pct) or not 0 <= cloud_pct <= 100:
        raise ParameterValidationError("max_cloud_pct must be a number from 0 to 100.")

    return MonitoringRequest(
        boundary=boundary,
        start_date=start,
        end_date=end,
        max_cloud_pct=float(cloud_pct),
    )
