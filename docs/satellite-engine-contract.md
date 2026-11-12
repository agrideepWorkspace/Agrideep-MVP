# Satellite engine integration contract

The existing `POST /parcels` request and satellite command-line interface are
preserved. Spring persists analysis jobs; RabbitMQ carries the worker request
and result messages.

## Existing command-line interface

```text
python satellite/run_analysis.py \
  --geometry path/to/parcel.geojson \
  --start 2026-03-01 \
  --end 2026-09-30 \
  --max-cloud 20 \
  --out path/to/result.json
```

The engine accepts GeoJSON Polygon and MultiPolygon geometry in WGS84
longitude/latitude order. The draft persistence API currently specifies Polygon
only; the backend must explicitly agree to MultiPolygon persistence before
accepting that geometry through `POST /parcels`. Dates, cloud threshold, output
file, exit status, and the legacy observation fields remain compatible with
the draft script interface.

## Successful result

`result.json` keeps the draft's `status` and ascending `observations` array.
Each observation retains `date`, nullable `ndvi`/`ndmi`, `cloud_pct`,
`valid_pixel_pct`, `valid`, and `invalid_reason`. The engine adds a versioned
metadata block, full per-observation statistics, summary, temporal analysis,
and paths to generated artifacts:

```json
{
  "status": "ok",
  "schema_version": "1.0",
  "metadata": {
    "source": "COPERNICUS/S2_SR_HARMONIZED",
    "start_date": "2026-03-01",
    "end_date": "2026-09-30",
    "max_cloud_pct": 20.0,
    "processing_scale_m": 20,
    "summary_statistic_basis": "Across valid observation means; per-observation pixel statistics are included separately."
  },
  "observations": [
    {
      "date": "2026-03-12",
      "ndvi": 0.42,
      "ndmi": 0.18,
      "cloud_pct": 5.0,
      "valid_pixel_pct": 96.0,
      "valid": true,
      "invalid_reason": null,
      "statistics": {
        "ndvi": {
          "mean": 0.42,
          "median": 0.41,
          "min": 0.12,
          "max": 0.71,
          "std_dev": 0.09
        },
        "ndmi": {
          "mean": 0.18,
          "median": 0.17,
          "min": -0.02,
          "max": 0.39,
          "std_dev": 0.06
        },
        "valid_pixel_count": 1234
      },
      "image_id": "example-image-id",
      "source_image_ids": "source-image-id",
      "spacecraft": "Sentinel-2A",
      "scene_cloud_pct": 8.3
    }
  ],
  "summary": {
    "n_observations": 1,
    "n_valid": 1,
    "n_invalid": 0,
    "valid_pct": 100.0,
    "area_ha": 2.4,
    "mean_cloud_pct": 5.0,
    "mean_valid_pixel_pct": 96.0,
    "max_observation_valid_pixel_count": 1234,
    "ndvi_mean": 0.42,
    "ndmi_mean": 0.18,
    "ndvi_median": 0.42,
    "ndvi_min": 0.12,
    "ndvi_max": 0.71,
    "ndvi_std_dev": 0.09,
    "ndmi_median": 0.18,
    "ndmi_min": -0.02,
    "ndmi_max": 0.39,
    "ndmi_std_dev": 0.06,
    "period_comparison": null
  },
  "temporal_analysis": {
    "baseline_date": "2026-03-12",
    "observations": [],
    "anomalies": []
  },
  "artifacts": {
    "output_directory": "result_artifacts",
    "observations_csv": "result_artifacts/observations.csv",
    "boundary_geojson": "result_artifacts/boundary.geojson",
    "map_png": "result_artifacts/orchard-map.png",
    "ndvi_map_png": "result_artifacts/ndvi-map.png",
    "ndmi_map_png": "result_artifacts/ndmi-map.png",
    "ndvi_chart_png": "result_artifacts/ndvi-timeseries.png",
    "ndmi_chart_png": "result_artifacts/ndmi-timeseries.png",
    "report_pdf": "result_artifacts/monitoring-report.pdf",
    "index_geotiffs": []
  }
}
```

The values above illustrate field shapes only; implementations and tests must
not use them as satellite observations. When no valid images are available,
the engine returns an explicit `no_imagery` error and never supplies fabricated
observations. The artifact paths are relative to the result file's parent
directory so the backend can persist or expose them.

## Failure result

Failures keep the draft's error envelope and script exit-code behavior:

```json
{
  "status": "error",
  "error": {
    "code": "invalid_geometry",
    "message": "Geometry must be a valid GeoJSON Polygon or MultiPolygon."
  }
}
```

The engine uses the draft codes (`ee_auth_failed`, `no_imagery`,
`invalid_geometry`, `timeout`, `unknown`) and adds `invalid_parameters`,
`area_out_of_range`, and `processing_error` where relevant. It exits zero only
when processing succeeds.

## Proposed result semantics

- `cloud_pct` is the estimated cloud/shadow area over the orchard; the
  collection's tile-wide cloud percentage is kept separately as
  `scene_cloud_pct`.
- `valid_pixel_pct` is valid pixel area divided by geodesic orchard area.
- NDVI and NDMI statistics are null on invalid observations; absent data is
  never converted to zero.
- NDVI uses its native 10 m bands; NDMI uses B8/B11 and is limited by the
  20 m B11 band. Regional statistics and joint exports use 20 m to avoid
  suggesting 10 m spatial detail for NDMI.
- Changes and anomaly flags are statistical screening results only. They do
  not establish a cause or diagnose disease, drought, irrigation failure, or
  olive-oil quality.

The existing backend contract's draft limits (0.1–500 ha, at most 12 months,
start date 2017-03-28, and default 20% cloud) are treated as configurable
defaults pending agreement by the backend owner. The engine remains a callable
CLI component and Python service; Spring is the HTTP API and RabbitMQ is the
asynchronous integration boundary.
