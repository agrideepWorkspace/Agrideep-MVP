# AgriDeep Satellite Engine

This module implements the Python processing side of the draft AgriDeep
satellite contract. It validates a user-supplied GeoJSON boundary and date
range, queries Sentinel-2 Surface Reflectance Harmonized scenes in Google
Earth Engine, masks cloud/shadow pixels, calculates orchard-level NDVI/NDMI
statistics, and writes a CSV, JSON, GeoTIFFs (when Earth Engine supports the
requested download), boundary map, charts, and PDF report.

The engine accepts GeoJSON `Polygon` and `MultiPolygon` geometries in WGS84
`[longitude, latitude]` coordinates. It does not create an orchard or assume
coordinates. The draft persistence API currently accepts Polygon only; its
owner must agree to MultiPolygon persistence before using MultiPolygon through
that API. See [the integration contract](../docs/satellite-engine-contract.md)
before changing backend schemas.

## Install

Use Python 3.10 or later. From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

For tests, install `requirements-dev.txt` instead. Copy `.env.example` to
`.env` and set `EE_PROJECT`. The numeric area, date, and scale settings mirror
draft contract proposals and can be changed through environment variables.
No key material belongs in `.env`, source control, or command-line arguments.
`SATELLITE_REQUEST_TIMEOUT_SECONDS` configures Earth Engine request deadlines and
GeoTIFF download timeouts; `SATELLITE_OUTPUT_DIR` is used when `--out` is omitted.

## Earth Engine authentication

1. Select a Google Cloud project that has the Earth Engine API enabled and
   access to the Sentinel-2 collection.
2. Set `EE_PROJECT` in `.env`.
3. Authenticate with Application Default Credentials:

   ```powershell
   earthengine authenticate
   ```

   On Windows, Docker Compose mounts Earth Engine's credentials from
   `%USERPROFILE%\.config\earthengine` into the satellite worker. Authenticate
   on the host before starting or restarting the worker.

   Alternatively, use an approved service account by setting both
   `EE_SERVICE_ACCOUNT` and `EE_PRIVATE_KEY_PATH` in `.env`. Keep the key file
   outside the repository and restrict its filesystem permissions.
4. Confirm the account/project has Earth Engine access and that its terms permit
   the intended AgriDeep use. Authentication, quotas, and export limits depend
   on the configured Google account/project.

The engine fails explicitly with `ee_auth_failed` when it cannot initialize;
it never substitutes sample imagery or synthetic observations.

## Run a monitoring request

The geometry must be supplied by the caller. The command below uses placeholders
for an existing GeoJSON file; it does not create a sample orchard:

```powershell
python satellite\run_analysis.py `
  --geometry <path-to-user-supplied.geojson> `
  --start YYYY-MM-DD `
  --end YYYY-MM-DD `
  --max-cloud 20 `
  --out data\output\analysis-001\result.json
```

The date interval is validated before any Earth Engine request. The draft
contract's proposed limits (0.1–500 ha, at most 12 months, imagery from
2017-03-28 onward, and 20% default cloud threshold) are configurable in `.env`.
`--max-cloud` is the maximum scene metadata cloud percentage used to filter
tiles and the maximum cloud/shadow area allowed over the orchard for an
observation to count as valid.

The command returns exit code 0 only for successful processing. It writes the
contract-compatible `result.json` and a sibling `result_artifacts` directory
containing:

- `observations.csv` and `boundary.geojson`
- `orchard-map.png`, latest-valid `ndvi-map.png`/`ndmi-map.png`, and
  `ndvi-timeseries.png`/`ndmi-timeseries.png`
- `monitoring-report.pdf`
- One NDVI GeoTIFF per valid acquisition at 10 m and one NDMI GeoTIFF at 20 m,
  when the Earth Engine download limit permits

The JSON `artifacts` object contains paths relative to the result file's
directory. A no-imagery run creates an explicit error result and a report
showing the data gap; it exits non-zero and contains no fabricated values.
Invalid inputs and Earth Engine failures return an error JSON at `--out` when
that path can be written.

## Backend integration

The full stack starts from the repository root with `docker compose up --build`.
The Spring API persists a `PENDING` analysis job and sends its parcel geometry
and requested date range to the durable `agrideep.analysis.requests` RabbitMQ
queue. This worker consumes one job at a time, publishes `RUNNING`, calls
`run_monitoring`, then publishes either the real result or an explicit failure
to `agrideep.analysis.results`. The API persists the result JSON; the API and
worker share the output volume so generated PDFs, maps, and CSVs can be served
through `/analyses/{id}/artifacts/{name}`.

Configure Earth Engine credentials in `.env` before submitting jobs. A missing
or invalid project/credential results in a failed job, never substituted
observations. The command-line interface remains available for direct runs,
and its result schema is documented in
[the integration contract](../docs/satellite-engine-contract.md).

## Tests

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

The tests cover index calculations, geometry/date validation, temporal and
observation statistics, report/artifact generation, SCL masking, collection
filter construction, and mocked Earth Engine authentication. They do not make
real Earth Engine requests or certify account credentials, quotas, or export
availability.

## Scientific limitations

NDVI and NDMI are spectral vegetation indicators. They do not independently
certify extra virgin olive oil, detect adulteration, determine exact harvest
dates, or definitively diagnose disease, drought, irrigation failure, or any
other agricultural cause. Statistical changes are prompts for further
investigation, not diagnoses. Ground observations and laboratory analysis are
needed for conclusions outside the scope of satellite spectral indices.
