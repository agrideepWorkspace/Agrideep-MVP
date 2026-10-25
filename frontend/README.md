# AgriDeep frontend

## Map data and usage

The parcel map uses **MapLibre GL JS**, **Esri World Imagery** satellite tiles, and public **AWS Terrain Tiles** elevation data. This configuration does not require an API key. It is not a Google Maps replacement: image coverage, age, and resolution vary by location, and 3D mode shows terrain relief rather than Google-style 3D buildings or photogrammetry. Public tile services have their own attribution, usage, and availability terms; check those terms before production or high-volume use.

## Start the development server

From this directory, run:

```powershell
npm install
npm run dev
```

Open the URL printed by Vite. Use **Satellite** or **3D terrain** to switch views. Use **Draw boundary**, click to add corners, then choose **Finish boundary**.

The parcel outline and area/perimeter are calculated in the browser. They are not sent to a satellite-analysis backend; the analysis screens still use sample data.
