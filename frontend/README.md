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

The backend folder in this repository currently has no Spring application, so run that service separately before expecting parcel saves to succeed.

From this directory, run:

```powershell
npm install
npm run dev
```

Open the URL printed by Vite. Use **Satellite** or **3D terrain** to switch views. Use **Draw boundary**, click to add corners, then choose **Finish boundary**.

The parcel outline and area/perimeter are calculated in the browser. They are not sent to a satellite-analysis backend; the analysis screens still use sample data.
