"""Earth Engine observation retrieval, statistics, and index downloads."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

from ..config import Settings
from ..exceptions import SatelliteProcessingError
from ..validation import MonitoringRequest
from .initialization import initialize_earth_engine
from .raster_export import export_index_geotiff
from .sentinel2 import (
    SCL_CLOUD_CLASSES,
    add_indices,
    build_collection,
    mosaic_acquisitions_by_time,
)

logger = logging.getLogger(__name__)

_STAT_KEYS = (
    "NDVI_mean",
    "NDVI_median",
    "NDVI_min",
    "NDVI_max",
    "NDVI_stdDev",
    "NDVI_count",
    "NDMI_mean",
    "NDMI_median",
    "NDMI_min",
    "NDMI_max",
    "NDMI_stdDev",
    "NDMI_count",
)
_PROPERTY_KEYS = (
    "system:index",
    "system:time_start",
    "SPACECRAFT_NAME",
    "agrideep_source_image_ids",
    "CLOUDY_PIXEL_PERCENTAGE",
    "MGRS_TILE",
    "_agrideep_valid_area_m2",
    "_agrideep_cloud_area_m2",
    *_STAT_KEYS,
)


def _earth_engine_exception_types(ee_module: Any) -> tuple[type[Exception], ...]:
    exception_type = getattr(
        getattr(ee_module, "ee_exception", None), "EEException", None
    )
    return (exception_type,) if isinstance(exception_type, type) else ()


def _processing_failure(exc: Exception) -> SatelliteProcessingError:
    message = str(exc).casefold()
    if isinstance(exc, (requests.Timeout, TimeoutError)) or any(
        marker in message for marker in ("deadline exceeded", "timed out", "timeout")
    ):
        return SatelliteProcessingError(
            "Earth Engine request timed out. Retry the analysis or reduce its scope.",
            code="timeout",
        )
    if "quota" in message or "rate limit" in message:
        return SatelliteProcessingError(
            "Earth Engine quota or rate limit was reached. Retry later or review "
            "the Cloud project quota.",
            code="processing_error",
        )
    return SatelliteProcessingError(
        f"Earth Engine processing failed ({type(exc).__name__}). "
        "Check project access, request limits, and the service logs.",
        code="processing_error",
    )


def _reduce_region(
    image: Any,
    geometry: Any,
    projection: Any,
    settings: Settings,
    *,
    ee_module: Any,
) -> Any:
    return image.reduceRegion(
        reducer=ee_module.Reducer.sum(),
        geometry=geometry,
        crs=projection,
        scale=settings.processing_scale_m,
        maxPixels=1_000_000_000,
        tileScale=settings.tile_scale,
    )


class EarthEngineProvider:
    """Fetch one per-acquisition, orchard-level Sentinel-2 observation series."""

    def __init__(
        self,
        settings: Settings,
        *,
        ee_module: Any | None = None,
    ) -> None:
        self.settings = settings
        self._ee_module = ee_module

    def _initialize(self) -> Any:
        if self._ee_module is None:
            self._ee_module = initialize_earth_engine(self.settings)
        return self._ee_module

    def _annotate_image(
        self,
        image: Any,
        geometry: Any,
        request: MonitoringRequest,
        *,
        ee_module: Any,
    ) -> Any:
        indexed = add_indices(image, ee_module=ee_module)
        scl = image.select("SCL")
        ndvi = indexed.select("NDVI")
        ndmi = indexed.select("NDMI")
        paired_mask = ndvi.mask().And(ndmi.mask())

        reducer = (
            ee_module.Reducer.mean()
            .combine(ee_module.Reducer.median(), sharedInputs=True)
            .combine(ee_module.Reducer.minMax(), sharedInputs=True)
            .combine(ee_module.Reducer.stdDev(), sharedInputs=True)
            .combine(ee_module.Reducer.count(), sharedInputs=True)
        )
        statistics = (
            indexed.select(["NDVI", "NDMI"])
            .updateMask(paired_mask)
            .reduceRegion(
                reducer=reducer,
                geometry=geometry,
                crs=scl.projection(),
                scale=self.settings.processing_scale_m,
                maxPixels=1_000_000_000,
                tileScale=self.settings.tile_scale,
            )
        )
        valid_area = _reduce_region(
            ee_module.Image.pixelArea()
            .updateMask(paired_mask)
            .rename("area"),
            geometry,
            scl.projection(),
            self.settings,
            ee_module=ee_module,
        ).get("area", 0)

        cloud_mask = scl.eq(SCL_CLOUD_CLASSES[0])
        for class_value in SCL_CLOUD_CLASSES[1:]:
            cloud_mask = cloud_mask.Or(scl.eq(class_value))
        cloud_area = _reduce_region(
            ee_module.Image.pixelArea()
            .updateMask(cloud_mask)
            .rename("area"),
            geometry,
            scl.projection(),
            self.settings,
            ee_module=ee_module,
        ).get("area", 0)

        return (
            indexed.setMulti(statistics)
            .set("_agrideep_valid_area_m2", valid_area)
            .set("_agrideep_cloud_area_m2", cloud_area)
        )

    @staticmethod
    def _statistic(
        properties: dict[str, Any],
        prefix: str,
        name: str,
    ) -> float | None:
        value = properties.get(f"{prefix}_{name}")
        return None if value is None else round(float(value), 6)

    def _observation(
        self,
        properties: dict[str, Any],
        request: MonitoringRequest,
    ) -> dict[str, Any]:
        timestamp = properties.get("system:time_start")
        if timestamp is None:
            raise SatelliteProcessingError(
                "Earth Engine returned an observation without an acquisition date."
            )
        observed_at = datetime.fromtimestamp(
            float(timestamp) / 1000, tz=timezone.utc
        )
        date_string = observed_at.date().isoformat()
        valid_area = float(properties.get("_agrideep_valid_area_m2") or 0)
        cloud_area = float(properties.get("_agrideep_cloud_area_m2") or 0)
        orchard_area_m2 = request.boundary.area_ha * 10_000
        valid_pixel_pct = min(100.0, max(0.0, valid_area / orchard_area_m2 * 100))
        cloud_pct = min(100.0, max(0.0, cloud_area / orchard_area_m2 * 100))
        pixel_count = int(
            min(
                float(properties.get("NDVI_count") or 0),
                float(properties.get("NDMI_count") or 0),
            )
        )

        statistics: dict[str, Any] = {
            "ndvi": {
                "mean": self._statistic(properties, "NDVI", "mean"),
                "median": self._statistic(properties, "NDVI", "median"),
                "min": self._statistic(properties, "NDVI", "min"),
                "max": self._statistic(properties, "NDVI", "max"),
                "std_dev": self._statistic(properties, "NDVI", "stdDev"),
            },
            "ndmi": {
                "mean": self._statistic(properties, "NDMI", "mean"),
                "median": self._statistic(properties, "NDMI", "median"),
                "min": self._statistic(properties, "NDMI", "min"),
                "max": self._statistic(properties, "NDMI", "max"),
                "std_dev": self._statistic(properties, "NDMI", "stdDev"),
            },
            "valid_pixel_count": pixel_count,
        }
        valid = pixel_count > 0 and cloud_pct <= request.max_cloud_pct
        invalid_reason = None
        if pixel_count == 0:
            invalid_reason = "no_valid_pixels"
        elif cloud_pct > request.max_cloud_pct:
            invalid_reason = "too_cloudy"
        if not valid:
            statistics["ndvi"] = None
            statistics["ndmi"] = None

        scene_cloud = properties.get("CLOUDY_PIXEL_PERCENTAGE")
        scene_cloud_pct = (
            round(float(scene_cloud), 2) if scene_cloud is not None else None
        )
        return {
            "date": date_string,
            "ndvi": statistics["ndvi"]["mean"] if valid else None,
            "ndmi": statistics["ndmi"]["mean"] if valid else None,
            "cloud_pct": round(cloud_pct, 2),
            "valid_pixel_pct": round(valid_pixel_pct, 2),
            "valid": valid,
            "invalid_reason": invalid_reason,
            "statistics": statistics,
            "image_id": str(properties.get("system:index", "")),
            "source_image_ids": properties.get("agrideep_source_image_ids"),
            "spacecraft": properties.get("SPACECRAFT_NAME"),
            "scene_cloud_pct": scene_cloud_pct,
            "mgrs_tiles": properties.get("MGRS_TILE"),
            "acquired_at": observed_at.isoformat(),
        }

    def fetch_observations(
        self,
        request: MonitoringRequest,
        output_dir: Path,
    ) -> dict[str, Any]:
        """Return observation records and attempted GeoTIFF exports."""
        ee_module = self._initialize()
        collection, geometry = build_collection(
            request, self.settings, ee_module=ee_module
        )
        collection = mosaic_acquisitions_by_time(collection, ee_module=ee_module)
        ee_errors = _earth_engine_exception_types(ee_module)
        try:
            image_count = int(collection.size().getInfo())
            if image_count == 0:
                return {"observations": [], "index_geotiffs": [], "warnings": []}

            annotated = collection.map(
                lambda image: self._annotate_image(
                    image, geometry, request, ee_module=ee_module
                )
            )
            features = ee_module.FeatureCollection(
                annotated.map(
                    lambda image: ee_module.Feature(
                        None, image.toDictionary(list(_PROPERTY_KEYS))
                    )
                )
            ).getInfo()["features"]
        except (*ee_errors, requests.RequestException, TimeoutError) as exc:
            failure = _processing_failure(exc)
            logger.error("%s", failure)
            raise failure from exc

        observations = [
            self._observation(feature["properties"], request)
            for feature in features
        ]
        observations.sort(key=lambda item: (item["date"], item["acquired_at"]))
        geotiffs: list[str] = []
        warnings: list[str] = []
        images = collection.toList(image_count)
        for index, observation in enumerate(observations):
            if not observation["valid"]:
                continue
            image = ee_module.Image(images.get(index))
            timestamp_token = "".join(
                character
                for character in observation["image_id"]
                if character.isdigit()
            )
            date_token = observation["date"].replace("-", "")
            for index_name in ("NDVI", "NDMI"):
                destination = output_dir / (
                    f"{index_name.lower()}_{date_token}_{timestamp_token}.tif"
                )
                try:
                    export_index_geotiff(
                        image,
                        index_name,
                        destination,
                        request,
                        self.settings,
                        ee_module=ee_module,
                    )
                except SatelliteProcessingError as exc:
                    warnings.append(str(exc))
                    continue
                geotiffs.append(str(destination))

        return {
            "observations": observations,
            "index_geotiffs": geotiffs,
            "warnings": warnings,
        }
