# Agrideep-MVP

AgriDeep MVP contains a React frontend for parcel mapping, a Spring API, and a Python Sentinel-2 analysis worker. The parcel map uses Esri World Imagery satellite tiles with optional 3D terrain relief, without requiring a Google Maps API key. Parcel and analysis data are loaded from the API.

## Run the full architecture

Copy `.env.example` to `.env`, set `EE_PROJECT`, and configure an Earth Engine service-account key under the ignored `secrets/` directory (or another approved credential setup). Then run:

```powershell
docker compose up --build
```

Open the frontend using `cd frontend; npm run dev`. The stack exposes the Spring API on `http://localhost:8000`, RabbitMQ management on `http://localhost:15673`, PostgreSQL on `localhost:5433`, and persists parcels and analysis artifacts in Docker volumes. Jobs without valid Earth Engine access fail explicitly; the system never substitutes sample satellite observations.

Set `GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/earth-engine.json` in `.env` and put the corresponding key at `secrets/earth-engine.json` for service-account authentication. Never commit the key file.

## Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. On the parcel selection page, use **Satellite** or **3D terrain** to change the map view. Choose **Draw boundary**, click the map to add polygon corners, then choose **Finish boundary**. Review map data attribution and usage notes in [frontend/README.md](./frontend/README.md).

Saving a drawn parcel posts its name and GeoJSON geometry to the Spring API at `http://localhost:8000/parcels` by default. Configure another API origin with `frontend/.env.local` if needed. Starting satellite analysis creates a persistent job and dispatches it to the Python worker through RabbitMQ.

## Satellite processing engine

The Python engine lives in [`satellite/`](./satellite/). Install dependencies
with `python -m pip install -r requirements.txt`, configure Earth Engine using
[`.env.example`](./.env.example), and follow the [satellite setup and CLI
instructions](./satellite/README.md). It implements the draft CLI interface and
writes statistics, temporal analysis, maps, charts, GeoTIFFs where available,
and a PDF monitoring report.

The existing draft backend contract is in `docs/api-contract.md.pdf`; the
engine's request/result shape is documented in
[`docs/satellite-engine-contract.md`](./docs/satellite-engine-contract.md).
