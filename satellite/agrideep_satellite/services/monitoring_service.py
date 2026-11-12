"""End-to-end orchestration for a single orchard monitoring request."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Protocol

from ..config import Settings
from ..gee.provider import EarthEngineProvider
from ..processing.statistics import summarize_observations
from ..processing.temporal_analysis import (
    analyze_temporal_evolution,
    compare_observation_periods,
)
from ..reporting.csv_export import export_observations_csv
from ..reporting.report_generator import generate_monitoring_report
from ..validation import MonitoringRequest
from ..validation import validate_monitoring_request
from ..visualization.charts import render_timeseries_chart
from ..visualization.maps import render_orchard_map
from ..visualization.raster_maps import render_latest_index_map

logger = logging.getLogger(__name__)
_SAFE_STEM = re.compile(r"[^A-Za-z0-9._-]+")


class ObservationProvider(Protocol):
    """Interface implemented by real and test satellite data providers."""

    def fetch_observations(
        self,
        request: MonitoringRequest,
        output_dir: Path,
    ) -> dict[str, Any]:
        """Return date-sorted observations, GeoTIFF paths, and warnings."""


def _safe_artifact_directory(output_json: Path) -> Path:
    safe_stem = _SAFE_STEM.sub("-", output_json.stem).strip(".-") or "monitoring"
    return output_json.parent / f"{safe_stem}_artifacts"


def _orchard_identifier(geometry_input: Any) -> str | None:
    if not isinstance(geometry_input, dict):
        return None
    properties = geometry_input.get("properties")
    if not isinstance(properties, dict):
        return None
    identifier = properties.get("name") or properties.get("id")
    if identifier is None:
        return None
    value = str(identifier).strip()
    return value or None


def _write_json_atomically(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    temporary_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    temporary_path.replace(path)


def run_monitoring(
    geometry: Any,
    start_date: str,
    end_date: str,
    *,
    output_json: Path,
    max_cloud_pct: float | None = None,
    settings: Settings | None = None,
    provider: ObservationProvider | None = None,
) -> dict[str, Any]:
    """Validate, process, and export one orchard monitoring request.

    The returned result and `output_json` retain the legacy CLI fields while
    adding the versioned statistics, temporal analysis, and artifact paths.
    """
    config = settings or Settings.from_env()
    request = validate_monitoring_request(
        geometry,
        start_date,
        end_date,
        max_cloud_pct,
        settings=config,
    )
    result_path = Path(output_json)
    result_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_dir = _safe_artifact_directory(result_path)
    artifact_dir.mkdir(parents=True, exist_ok=True)
    satellite_provider = provider or EarthEngineProvider(config)
    logger.info(
        "Starting Sentinel-2 monitoring for %s to %s (%.2f ha)",
        request.start_date,
        request.end_date,
        request.boundary.area_ha,
    )
    provider_result = satellite_provider.fetch_observations(request, artifact_dir)
    observations = provider_result["observations"]
    observations.sort(key=lambda item: (item["date"], item.get("acquired_at", "")))

    summary = summarize_observations(observations)
    summary["area_ha"] = round(request.boundary.area_ha, 4)
    summary["period_comparison"] = compare_observation_periods(observations)
    temporal_analysis = analyze_temporal_evolution(observations)
    warnings = list(provider_result.get("warnings", []))
    no_imagery = not observations
    if no_imagery:
        warnings.append(
            "No Sentinel-2 observations met the scene filters for this monitoring period."
        )

    def output_relative(path: Path) -> str:
        return str(path.relative_to(result_path.parent))

    artifact_paths: dict[str, Any] = {
        "output_directory": output_relative(artifact_dir),
        "observations_csv": output_relative(artifact_dir / "observations.csv"),
        "boundary_geojson": output_relative(artifact_dir / "boundary.geojson"),
        "map_png": output_relative(artifact_dir / "orchard-map.png"),
        "ndvi_map_png": output_relative(artifact_dir / "ndvi-map.png"),
        "ndmi_map_png": output_relative(artifact_dir / "ndmi-map.png"),
        "ndvi_chart_png": output_relative(artifact_dir / "ndvi-timeseries.png"),
        "ndmi_chart_png": output_relative(artifact_dir / "ndmi-timeseries.png"),
        "report_pdf": output_relative(artifact_dir / "monitoring-report.pdf"),
        "index_geotiffs": [
            output_relative(Path(path))
            for path in provider_result.get("index_geotiffs", [])
        ],
    }

    boundary_feature = {
        "type": "Feature",
        "properties": {
            "area_ha": round(request.boundary.area_ha, 4),
            "identifier": _orchard_identifier(geometry),
        },
        "geometry": request.boundary.geojson,
    }
    _write_json_atomically(artifact_dir / "boundary.geojson", boundary_feature)
    export_observations_csv(observations, artifact_dir / "observations.csv")
    render_orchard_map(request.boundary.geometry, artifact_dir / "orchard-map.png")
    render_timeseries_chart(
        observations, "ndvi", artifact_dir / "ndvi-timeseries.png"
    )
    render_timeseries_chart(
        observations, "ndmi", artifact_dir / "ndmi-timeseries.png"
    )
    geotiff_paths = [
        Path(path) for path in provider_result.get("index_geotiffs", [])
    ]
    for index_name in ("ndvi", "ndmi"):
        render_latest_index_map(
            [
                path for path in geotiff_paths
                if path.name.startswith(f"{index_name}_")
            ],
            index_name,
            artifact_dir / f"{index_name}-map.png",
        )

    metadata = {
        "source": "COPERNICUS/S2_SR_HARMONIZED",
        "start_date": request.start_date.isoformat(),
        "end_date": request.end_date.isoformat(),
        "max_cloud_pct": request.max_cloud_pct,
        "area_ha": round(request.boundary.area_ha, 4),
        "perimeter_m": round(request.boundary.perimeter_m, 2),
        "geometry_type": request.boundary.geometry.geom_type,
        "orchard_identifier": _orchard_identifier(geometry),
        "summary_statistic_basis": (
            "Across valid observation means; each observation's pixel-level "
            "statistics are included separately."
        ),
        "processing_scale_m": config.processing_scale_m,
        "index_bands": {
            "ndvi": {"nir": "B8", "red": "B4", "native_resolution_m": 10},
            "ndmi": {"nir": "B8", "swir": "B11", "native_resolution_m": 20},
        },
        "cloud_mask": {
            "band": "SCL",
            "masked_classes": [0, 1, 3, 7, 8, 9, 10, 11],
            "cloud_classes": [3, 8, 9, 10],
        },
    }
    result: dict[str, Any] = {
        "status": "error" if no_imagery else "ok",
        "schema_version": "1.0",
        "metadata": metadata,
        "observations": observations,
        "summary": summary,
        "temporal_analysis": temporal_analysis,
        "artifacts": artifact_paths,
        "warnings": warnings,
    }
    if no_imagery:
        result["error"] = {
            "code": "no_imagery",
            "message": (
                "No Sentinel-2 observations met the requested filters. "
                "No index values were generated."
            ),
        }

    generate_monitoring_report(
        result,
        map_path=artifact_dir / "orchard-map.png",
        ndvi_map_path=artifact_dir / "ndvi-map.png",
        ndmi_map_path=artifact_dir / "ndmi-map.png",
        ndvi_chart_path=artifact_dir / "ndvi-timeseries.png",
        ndmi_chart_path=artifact_dir / "ndmi-timeseries.png",
        destination=artifact_dir / "monitoring-report.pdf",
    )
    _write_json_atomically(result_path, result)
    logger.info(
        "Monitoring finished with status=%s, observations=%d, valid=%d",
        result["status"],
        summary["n_observations"],
        summary["n_valid"],
    )
    return result
