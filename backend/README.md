# AgriDeep backend

Spring Boot API for parcel persistence and asynchronous satellite-analysis jobs. It validates GeoJSON boundaries, measures parcels with PostGIS, stores analysis jobs and results in PostgreSQL, dispatches work through RabbitMQ, and serves the Python worker's generated files.

## Run the full stack

From the repository root, copy `.env.example` to `.env`, configure Earth Engine access, then run:

```powershell
docker compose up --build
```

This starts PostgreSQL/PostGIS, RabbitMQ, the API at `http://localhost:8000`, and one Python satellite worker. The default host ports are PostgreSQL `5433`, RabbitMQ `5673`, and RabbitMQ management `15673`. Database data and analysis artifacts persist in Docker volumes. `docker compose down -v` removes those volumes and their data.

Set `EE_PROJECT` in `.env`. For a service account, put the private key at `secrets/earth-engine.json`, set `GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/earth-engine.json`, and ensure the Earth Engine API is enabled for the project. The `secrets/` directory is ignored by Git. Without valid credentials, analysis jobs fail with an explicit worker error; they do not return sample satellite data.

## Run the API from source

You need Java 17+, PostgreSQL with PostGIS, and RabbitMQ. Start the supporting services, then launch Spring:

```powershell
docker compose up -d db rabbitmq
cd backend
.\mvnw.cmd spring-boot:run
```

The Maven wrapper downloads Maven as needed. Check `http://localhost:8000/actuator/health`.

Run backend tests with:

```powershell
.\mvnw.cmd test
```

Docker must be running because the tests use Testcontainers with PostgreSQL/PostGIS.

## API

| Method | Path | Result |
| --- | --- | --- |
| `POST` | `/parcels` | Saves a validated parcel; returns `201 Created`. |
| `GET` | `/parcels` | Lists saved parcels, newest first. |
| `GET` | `/parcels/{id}` | Returns a parcel, or `404`. |
| `DELETE` | `/parcels/{id}` | Deletes a parcel and its analysis jobs; returns `204`. |
| `POST` | `/parcels/{id}/analyses` | Persists and queues a job; returns `202 Accepted`. |
| `GET` | `/parcels/{id}/analyses` | Lists a parcel's jobs, newest first. |
| `GET` | `/analyses/{id}` | Returns job status, errors, and results when available. |
| `GET` | `/analyses/{id}/artifacts/{name}` | Serves generated report, map, CSV, or boundary artifacts. |

Create a job with:

```json
{
  "startDate": "2026-03-01",
  "endDate": "2026-09-30",
  "maxCloudPct": 20
}
```

`maxCloudPct` is optional and defaults to the worker's `SATELLITE_MAX_CLOUD_PCT`. Job status is `PENDING`, `RUNNING`, `COMPLETED`, or `FAILED`. The request is published after the database transaction commits. The worker runs the existing `satellite/run_analysis.py` engine contract, publishes the result event, and the API stores the full result JSON. A successful result includes genuine Sentinel-2 observations and artifact paths. Authentication, validation, processing, and no-imagery failures are exposed on the failed job.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `SERVER_PORT` | `8000` | HTTP port. |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/agrideep` | PostgreSQL/PostGIS connection. |
| `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` | `agrideep`, `agrideep` | Database credentials. |
| `RABBITMQ_HOST`, `RABBITMQ_PORT` | `localhost`, `5672` | RabbitMQ connection. |
| `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD` | `agrideep`, `agrideep` | RabbitMQ credentials. |
| `ANALYSIS_REQUEST_QUEUE` | `agrideep.analysis.requests` | Durable API-to-worker queue. |
| `ANALYSIS_RESULT_QUEUE` | `agrideep.analysis.results` | Durable worker-to-API queue. |
| `SATELLITE_OUTPUT_DIR` | `data/output` | Shared worker/API artifact directory. |
| `AGRIDEEP_CORS_ALLOWED_ORIGINS` | Vite dev and preview on localhost | Allowed browser origins. |

Parcel geometry is stored as PostGIS `geometry(Polygon, 4326)`. Schema creation/upgrades are handled by Hibernate for this MVP; production should use versioned migrations.
