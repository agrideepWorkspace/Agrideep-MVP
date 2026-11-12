# AgriDeep frontend

## Map data and usage

The parcel map uses **MapLibre GL JS**, **Esri World Imagery** satellite tiles, and public **AWS Terrain Tiles** elevation data. This configuration does not require an API key. It is not a Google Maps replacement: image coverage, age, and resolution vary by location, and 3D mode shows terrain relief rather than Google-style 3D buildings or photogrammetry. Public tile services have their own attribution, usage, and availability terms; check those terms before production or high-volume use.

## Start the development server

The frontend saves parcels with `POST {VITE_API_BASE_URL}/parcels`. The default base URL is `http://localhost:8000`, matching the API contract. To use a different Spring server, copy `.env.example` to `.env.local`, change `VITE_API_BASE_URL`, and restart Vite. The Spring API must allow requests from the frontend origin (usually `http://localhost:5173`) with the `Content-Type` header.

The request body is the parcel name and the GeoJSON Polygon geometry:

```json
{
  "name": "North Grove Sector A",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-3.78, 37.77], [-3.77, 37.77], [-3.77, 37.78], [-3.78, 37.77]]]
  }
}
```

The backend should return `201 Created` with the saved parcel object, including its `id`. A failed request is shown in the parcel form; the app does not navigate as if saving succeeded.

From this directory, run:

```powershell
npm install
npm run dev
```

Open the URL printed by Vite. Use **Satellite** or **3D terrain** to switch views. Use **Draw boundary**, click to add corners, then choose **Finish boundary**.

Saved parcel lists, parcel detail pages, and analysis jobs load from the Spring API. The browser area and perimeter are estimates; the API recalculates both when the parcel is saved.

From a saved parcel's analysis page, submit an analysis period and cloud threshold to create a queued job. The page polls its real `PENDING`, `RUNNING`, `COMPLETED`, or `FAILED` status. Completed results, observations, generated maps, CSV, and PDF are read from the API; no satellite values are fabricated.

The API and Python worker use RabbitMQ. Start the full stack from the repository root with `docker compose up --build`; copy `.env.example` to `.env` first and configure Earth Engine access for real runs. Without Earth Engine credentials, a submitted job will appear as failed with the worker's explicit authentication error.
