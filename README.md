# Agrideep-MVP

AgriDeep MVP is a React frontend for parcel mapping and olive-orchard monitoring. The parcel map uses Esri World Imagery satellite tiles with optional 3D terrain relief, without requiring a Google Maps API key. Analysis screens currently use sample data; satellite analysis is not connected to the drawn parcel yet.

## Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. On the parcel selection page, use **Satellite** or **3D terrain** to change the map view. Choose **Draw boundary**, click the map to add polygon corners, then choose **Finish boundary**. Review map data attribution and usage notes in [frontend/README.md](./frontend/README.md).
