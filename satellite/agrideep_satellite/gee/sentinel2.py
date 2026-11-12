"""Sentinel-2 Surface Reflectance Harmonized collection processing."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from ..config import Settings
from ..validation import MonitoringRequest
from .cloud_masking import mask_sentinel2_clouds

SENTINEL2_COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"
SCL_CLOUD_CLASSES = (3, 8, 9, 10)


def build_collection(
    request: MonitoringRequest,
    settings: Settings,
    *,
    ee_module: Any,
) -> tuple[Any, Any]:
    """Filter scenes by orchard, date, and scene cloud metadata."""
    geometry = ee_module.Geometry(request.boundary.geojson)
    end_exclusive = (request.end_date + timedelta(days=1)).isoformat()
    collection = (
        ee_module.ImageCollection(SENTINEL2_COLLECTION)
        .filterBounds(geometry)
        .filterDate(request.start_date.isoformat(), end_exclusive)
        .filter(ee_module.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", request.max_cloud_pct))
        .sort("system:time_start")
    )
    return collection, geometry


def mosaic_acquisitions_by_time(collection: Any, *, ee_module: Any) -> Any:
    """Mosaic overlapping MGRS tiles from the same Sentinel-2 acquisition."""
    acquisition_times = collection.aggregate_array("system:time_start").distinct().sort()

    def mosaic(timestamp: Any) -> Any:
        matching = collection.filter(
            ee_module.Filter.eq("system:time_start", timestamp)
        )
        return matching.mosaic().set(
            {
                "system:time_start": timestamp,
                "system:index": ee_module.Number(timestamp).format("%.0f"),
                "SPACECRAFT_NAME": matching.aggregate_first("SPACECRAFT_NAME"),
                "agrideep_source_image_ids": (
                    matching.aggregate_array("system:index").distinct().join(",")
                ),
                "CLOUDY_PIXEL_PERCENTAGE": matching.aggregate_mean(
                    "CLOUDY_PIXEL_PERCENTAGE"
                ),
                "MGRS_TILE": matching.aggregate_array("MGRS_TILE").distinct().join(","),
            }
        )

    return ee_module.ImageCollection.fromImages(acquisition_times.map(mosaic))


def add_indices(image: Any, *, ee_module: Any) -> Any:
    """Apply the SCL mask and add NDVI/NDMI bands with denominator guards."""
    masked = mask_sentinel2_clouds(image, ee_module=ee_module)
    nir = masked.select("B8")
    red = masked.select("B4")
    swir = masked.select("B11")

    ndvi_denominator = nir.add(red)
    ndmi_denominator = nir.add(swir)
    ndvi = (
        nir.subtract(red)
        .divide(ndvi_denominator)
        .updateMask(ndvi_denominator.neq(0))
        .rename("NDVI")
    )
    ndmi = (
        nir.subtract(swir)
        .divide(ndmi_denominator)
        .updateMask(ndmi_denominator.neq(0))
        .rename("NDMI")
        .setDefaultProjection(swir.projection())
    )
    return masked.addBands([ndvi, ndmi])
