# AgriDeep backend

Spring Boot API that stores the parcels drawn in the frontend. It validates each GeoJSON boundary, measures its area and perimeter with PostGIS, and keeps the parcels in PostgreSQL. Satellite analysis is not part of this service yet.

## Run with Docker

From the repository root, with Docker installed:

```powershell
docker compose up --build
```

This starts PostgreSQL 17 with PostGIS 3.6 and the API on `http://localhost:8000`. Parcels are kept in the `postgres-data` Docker volume across restarts. Stop with `docker compose down`, or `docker compose down -v` to also delete the saved parcels. A volume from before the switch to PostGIS is upgraded on startup, keeping its parcels.

The database is also reachable from your own machine at `localhost:5432` (database, user and password `agrideep`), for tools such as psql or DBeaver. To change these values or the ports, copy `.env.example` in the repository root to `.env` and edit it.

## Run from source

You need **Java 17 or newer** and a PostgreSQL database with PostGIS. Maven is not required; the Maven wrapper downloads it. If `JAVA_HOME` is set, it must point to a Java 17+ JDK.

From the repository root, start only the database with Docker, then the API:

```powershell
docker compose up -d db
cd backend
.\mvnw.cmd spring-boot:run
```

On macOS or Linux, run `./mvnw spring-boot:run` instead.

The API listens on `http://localhost:8000`, which is the frontend's default `VITE_API_BASE_URL`. Check that the service is up at `http://localhost:8000/actuator/health`.

Run the tests with `.\mvnw.cmd test` (or `./mvnw test`). Docker must be running: the tests start their own PostGIS container with [Testcontainers](https://testcontainers.com/).

## Project structure

The code is in `src/main/java/com/agrideep/backend/` and uses [Lombok](https://projectlombok.org/) for getters, constructors, builders and loggers. Install the Lombok plugin for your IDE if it does not recognize the generated methods (VS Code's Java extension and IntelliJ IDEA include it).

| Package | Contents |
| --- | --- |
| `controller` | `ParcelController`: the `/parcels` HTTP endpoints. |
| `service` | `ParcelService`: creates, lists and deletes parcels. `GeometryService`: validates and measures boundaries with PostGIS. |
| `repository` | `ParcelRepository`: Spring Data JPA access to the `parcels` table. |
| `model` | `Parcel` (JPA entity; the boundary is a PostGIS `geometry(Polygon, 4326)` column), `PolygonGeometry` (GeoJSON polygon) with its `LinearRing` and `Position` records, `PolygonMeasurements`. |
| `dto` | Request and response bodies: `CreateParcelRequest`, `ParcelResponse`, `ApiErrorResponse`. |
| `mapper` | `ParcelMapper`: converts a `Parcel` entity to a `ParcelResponse`. |
| `exception` | Exceptions and `GlobalExceptionHandler`, which turns them into the error responses below. |
| `config` | `WebConfig` and `CorsProperties`: which browser origins may call the API. |

## API

| Method | Path | Result |
| --- | --- | --- |
| `POST` | `/parcels` | Saves a parcel. Returns `201 Created`, a `Location` header and the saved parcel. |
| `GET` | `/parcels` | Lists saved parcels, newest first. |
| `GET` | `/parcels/{id}` | Returns one parcel, or `404`. |
| `DELETE` | `/parcels/{id}` | Deletes a parcel. Returns `204 No Content`, or `404`. |

The request body for `POST /parcels` is the one the frontend sends:

```json
{
  "name": "North Grove Sector A",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-3.78, 37.77], [-3.77, 37.77], [-3.77, 37.78], [-3.78, 37.77]]]
  }
}
```

A saved parcel looks like this:

```json
{
  "id": "bf6e65e7-b13d-4844-b48e-9d37fb53a670",
  "name": "North Grove Sector A",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-3.78, 37.77], [-3.77, 37.77], [-3.77, 37.78], [-3.78, 37.77]]]
  },
  "areaHa": 48.9,
  "perimeterM": 3408,
  "createdAt": "2026-10-28T12:11:32.084788Z"
}
```

PostGIS measures the area and perimeter on the WGS 84 ellipsoid. `areaHa` is rounded to two decimals and `perimeterM` to whole meters. The parcel form estimates them on a sphere, so it can show slightly different values (about 0.1% apart). Unknown request fields are ignored.

### Validation

- `name` is required, cannot be blank and can have up to 120 characters. Leading and trailing spaces are removed.
- `geometry` must be a GeoJSON `Polygon` with exactly one ring. Polygons with holes are not accepted.
- Positions are `[longitude, latitude]`, with an optional altitude that is not stored. Longitude must be between -180 and 180 and latitude between -90 and 90.
- The ring must be closed (last position equal to the first), have 3 to 1,999 distinct corners, be a valid polygon for PostGIS (`ST_IsValid`: it does not cross or touch itself), and enclose an area.

### Errors

Every error uses the same shape. The frontend shows `error.message` in the parcel form.

```json
{
  "error": {
    "code": "INVALID_GEOMETRY",
    "message": "The parcel boundary crosses itself. Redraw it so that its edges do not cross."
  }
}
```

| Status | `code` | When |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | `name` or `geometry` is missing or invalid. `details` lists each field and its problem. |
| 400 | `INVALID_GEOMETRY` | The boundary breaks one of the geometry rules above. |
| 400 | `MALFORMED_REQUEST` | The body is not JSON or does not have the expected structure. |
| 400 | `BAD_REQUEST` | The `{id}` in the path is not a UUID. |
| 404 | `PARCEL_NOT_FOUND` | No parcel has that `id`. |
| 404, 405, 415 | `NOT_FOUND`, `METHOD_NOT_ALLOWED`, `UNSUPPORTED_MEDIA_TYPE` | Unknown path, unsupported HTTP method, or a body that is not `application/json`. |
| 500 | `INTERNAL_ERROR` | Unexpected server error. Details are written to the server log only. |

## Configuration

Settings are in `src/main/resources/application.properties`. Override them with environment variables, for example in the `backend` service of `docker-compose.yml`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SERVER_PORT` | `8000` | HTTP port. If you change it, also change `VITE_API_BASE_URL` in the frontend. |
| `AGRIDEEP_CORS_ALLOWED_ORIGINS` | Vite dev (`5173`) and preview (`4173`) on `localhost` and `127.0.0.1` | Comma-separated browser origins allowed to call the API. |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/agrideep` | PostgreSQL database. It must have PostGIS installed. |
| `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` | `agrideep`, `agrideep` | Database credentials. |

On startup, `src/main/resources/schema.sql` enables the PostGIS extension and converts parcels saved before PostGIS. The `parcels` table is then created or updated automatically (`spring.jpa.hibernate.ddl-auto=update`). That is convenient for the MVP. Before production, replace it with versioned migrations such as Flyway.
