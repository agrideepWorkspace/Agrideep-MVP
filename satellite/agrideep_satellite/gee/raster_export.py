"""Download individual Earth Engine index bands as validated GeoTIFFs."""

from __future__ import annotations

import io
import logging
import re
import zipfile
from pathlib import Path
from typing import Any

import rasterio
import requests

from ..config import Settings
from ..exceptions import SatelliteProcessingError
from ..validation import MonitoringRequest
from .sentinel2 import add_indices

logger = logging.getLogger(__name__)
_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


def _geotiff_bytes(content: bytes) -> bytes:
    if not zipfile.is_zipfile(io.BytesIO(content)):
        return content
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        candidates = [
            item for item in archive.infolist()
            if not item.is_dir() and item.filename.lower().endswith((".tif", ".tiff"))
        ]
        if len(candidates) != 1:
            raise SatelliteProcessingError(
                "Earth Engine index download did not contain exactly one GeoTIFF."
            )
        return archive.read(candidates[0])


def export_index_geotiff(
    image: Any,
    index_name: str,
    destination: Path,
    request: MonitoringRequest,
    settings: Settings,
    *,
    ee_module: Any,
) -> None:
    """Export one image/index at its native limiting band resolution."""
    scale = 10 if index_name == "NDVI" else 20
    prepared = add_indices(image, ee_module=ee_module)
    geometry = ee_module.Geometry(request.boundary.geojson)
    safe_name = _SAFE_NAME.sub("-", destination.stem).strip(".-") or "index"
    temporary_path = destination.with_suffix(destination.suffix + ".tmp")
    ee_exception = getattr(
        getattr(ee_module, "ee_exception", None), "EEException", None
    )
    expected_errors: tuple[type[Exception], ...] = (
        requests.RequestException,
        OSError,
        zipfile.BadZipFile,
    )
    if isinstance(ee_exception, type):
        expected_errors += (ee_exception,)
    try:
        url = prepared.select(index_name).getDownloadURL(
            {
                "name": safe_name,
                "scale": scale,
                "region": geometry,
                "format": "GEO_TIFF",
            }
        )
        response = requests.get(url, timeout=settings.request_timeout_seconds)
        response.raise_for_status()
        content = _geotiff_bytes(response.content)
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = destination.with_suffix(destination.suffix + ".tmp")
        temporary_path.write_bytes(content)
        try:
            with rasterio.open(temporary_path) as dataset:
                if dataset.count != 1 or dataset.crs is None:
                    raise SatelliteProcessingError(
                        f"Downloaded {index_name} GeoTIFF is missing a band or CRS."
                    )
        except rasterio.errors.RasterioError:
            temporary_path.unlink(missing_ok=True)
            raise SatelliteProcessingError(
                f"Earth Engine returned an invalid {index_name} GeoTIFF."
            ) from None
        temporary_path.replace(destination)
    except expected_errors as exc:
        temporary_path.unlink(missing_ok=True)
        logger.warning(
            "Could not export %s GeoTIFF to %s (%s)",
            index_name,
            destination,
            type(exc).__name__,
        )
        raise SatelliteProcessingError(
            f"Could not export {index_name} GeoTIFF ({type(exc).__name__})."
        ) from exc
