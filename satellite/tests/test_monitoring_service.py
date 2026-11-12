from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

import numpy as np
import rasterio
from rasterio.transform import from_origin

from agrideep_satellite.config import Settings
from agrideep_satellite.services.monitoring_service import run_monitoring
from agrideep_satellite.visualization.raster_maps import render_latest_index_map
from run_analysis import main


class EmptyProvider:
    def fetch_observations(self, request: Any, output_dir: Path) -> dict[str, Any]:
        return {"observations": [], "index_geotiffs": [], "warnings": []}


class ValidObservationProvider:
    """Synthetic provider used only to exercise the successful export path."""

    def fetch_observations(self, request: Any, output_dir: Path) -> dict[str, Any]:
        observation = {
            "date": "2020-03-15",
            "ndvi": 0.4,
            "ndmi": 0.12,
            "cloud_pct": 2.5,
            "valid_pixel_pct": 95.0,
            "valid": True,
            "invalid_reason": None,
            "statistics": {
                "ndvi": {
                    "mean": 0.4,
                    "median": 0.39,
                    "min": 0.1,
                    "max": 0.7,
                    "std_dev": 0.12,
                },
                "ndmi": {
                    "mean": 0.12,
                    "median": 0.11,
                    "min": -0.1,
                    "max": 0.3,
                    "std_dev": 0.08,
                },
                "valid_pixel_count": 25,
            },
            "image_id": "synthetic-test-id",
            "spacecraft": "Sentinel-2A",
            "scene_cloud_pct": 8.0,
            "acquired_at": "2020-03-15T10:00:00+00:00",
        }
        return {"observations": [observation], "index_geotiffs": [], "warnings": []}


def test_no_imagery_creates_explicit_empty_artifacts_without_fake_observations(
    tmp_path: Path,
) -> None:
    geometry = {
        "type": "Feature",
        "properties": {"name": "Synthetic test boundary"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [0, 0],
                [0.01, 0],
                [0.01, 0.01],
                [0, 0.01],
                [0, 0],
            ]],
        },
    }
    output_json = tmp_path / "run.json"

    result = run_monitoring(
        geometry,
        "2020-03-01",
        "2020-03-31",
        output_json=output_json,
        settings=Settings(),
        provider=EmptyProvider(),
    )

    artifact_dir = tmp_path / "run_artifacts"
    saved_result = json.loads(output_json.read_text(encoding="utf-8"))
    assert result["status"] == "error"
    assert result["error"]["code"] == "no_imagery"
    assert saved_result["observations"] == []
    assert saved_result["summary"]["ndvi_mean"] is None
    assert saved_result["summary"]["valid_pct"] is None
    assert saved_result["metadata"]["orchard_identifier"] == "Synthetic test boundary"
    assert (artifact_dir / "boundary.geojson").is_file()
    assert (artifact_dir / "orchard-map.png").read_bytes().startswith(b"\x89PNG")
    assert (artifact_dir / "ndvi-timeseries.png").read_bytes().startswith(b"\x89PNG")
    assert (artifact_dir / "ndmi-timeseries.png").read_bytes().startswith(b"\x89PNG")
    assert (artifact_dir / "ndvi-map.png").read_bytes().startswith(b"\x89PNG")
    assert (artifact_dir / "ndmi-map.png").read_bytes().startswith(b"\x89PNG")
    assert (artifact_dir / "monitoring-report.pdf").read_bytes().startswith(b"%PDF-")
    with (artifact_dir / "observations.csv").open(
        newline="", encoding="utf-8"
    ) as csv_file:
        rows = list(csv.DictReader(csv_file))
    assert rows == []


def test_valid_mock_observation_creates_statistics_csv_and_pdf(
    tmp_path: Path,
) -> None:
    geometry = {
        "type": "Polygon",
        "coordinates": [[
            [0, 0],
            [0.01, 0],
            [0.01, 0.01],
            [0, 0.01],
            [0, 0],
        ]],
    }

    result = run_monitoring(
        geometry,
        "2020-03-01",
        "2020-03-31",
        output_json=tmp_path / "success.json",
        settings=Settings(),
        provider=ValidObservationProvider(),
    )

    artifact_dir = tmp_path / "success_artifacts"
    assert result["status"] == "ok"
    assert result["summary"]["ndvi_mean"] == 0.4
    assert result["summary"]["n_valid"] == 1
    assert (artifact_dir / "monitoring-report.pdf").read_bytes().startswith(b"%PDF-")
    with (artifact_dir / "observations.csv").open(
        newline="", encoding="utf-8"
    ) as csv_file:
        rows = list(csv.DictReader(csv_file))
    assert len(rows) == 1
    assert rows[0]["ndvi"] == "0.4"


def test_cli_writes_contract_error_json_for_invalid_geometry(tmp_path: Path) -> None:
    geometry_path = tmp_path / "invalid.geojson"
    geometry_path.write_text(
        json.dumps({"type": "Point", "coordinates": [0, 0]}),
        encoding="utf-8",
    )
    output_path = tmp_path / "failed" / "result.json"

    exit_code = main(
        [
            "--geometry",
            str(geometry_path),
            "--start",
            "2020-03-01",
            "--end",
            "2020-03-31",
            "--out",
            str(output_path),
        ]
    )

    result = json.loads(output_path.read_text(encoding="utf-8"))
    assert exit_code == 1
    assert result["status"] == "error"
    assert result["error"]["code"] == "invalid_geometry"


def test_index_map_renders_from_a_geotiff(tmp_path: Path) -> None:
    raster_path = tmp_path / "ndvi_20260301_123.tif"
    with rasterio.open(
        raster_path,
        "w",
        driver="GTiff",
        width=2,
        height=2,
        count=1,
        dtype="float32",
        crs="EPSG:32632",
        transform=from_origin(500_000, 4_000_000, 20, 20),
        nodata=-9999,
    ) as dataset:
        dataset.write(np.array([[0.2, 0.4], [0.6, 0.8]], dtype=np.float32), 1)

    destination = tmp_path / "ndvi-map.png"
    render_latest_index_map([raster_path], "ndvi", destination)

    assert destination.read_bytes().startswith(b"\x89PNG")
