// ============================================================
// src/data/mockData.js — MOCK DATA (Simulated API responses)
// ============================================================
//
// WHAT IS MOCK DATA?
// During development, the backend API might not be ready yet.
// Mock data lets us build the full UI with realistic-looking data.
// Later, we replace these constants with real fetch() API calls.
//
// In React, data usually comes from:
//   1. Props     → passed from a parent component
//   2. State     → stored inside a component with useState()
//   3. API calls → fetched with useEffect() + fetch()/axios
//   4. Context   → shared global data (useContext)
//
// Right now, we start with option 1: we import this mock data
// and pass it as props to our components. Easy to replace later.
// ============================================================

// ── PARCELS LIST ──────────────────────────────────────────────
// Simulates what a GET /api/parcels response would look like.
export const MOCK_PARCELS = [
  {
    id: 'olive-grove-a',
    name: 'Olive Grove A',
    cropType: 'Olive Orchard (Mediterranean)',
    location: 'Jaén, Andalusia, Spain',
    coordinates: '37.7749° N, 3.7849° W',
    totalArea: 2.43,     // hectares
    perimeter: 642,      // meters
    status: 'active',
  },
  {
    id: 'sector-g12',
    name: 'Sector G-12 (North Grove)',
    cropType: 'Olea europaea (Picual)',
    location: 'Jaén, Andalusia, Spain',
    coordinates: '37.7749° N, 3.7849° W',
    totalArea: 3.10,
    perimeter: 720,
    status: 'active',
  },
]

// ── ACTIVE ANALYSIS (for the Dashboard screen) ────────────────
// Simulates what a GET /api/analysis/:id response would look like.
export const MOCK_ANALYSIS = {
  parcelName: 'Olive Grove A',
  subtitle: 'Satellite vegetation and moisture monitoring (Sentinel-2 L2A)',
  dateRange: 'Aug 01 – Oct 15, 2023',
  status: 'Active Monitor',

  // KPI Cards
  meanNdvi: 0.42,
  meanNdmi: 0.14,
  ndviDelta: -12.5,   // % change vs last month (negative = decrease)
  ndmiDelta: -14.3,
  cloudCoverage: 4.2,

  // Line chart data points (bi-weekly)
  // Each object = one data point on the chart
  // 'date' appears on X-axis, 'ndvi' and 'ndmi' are the Y values
  trendData: [
    { date: 'Aug 01', ndvi: 0.49, ndmi: 0.19 },
    { date: 'Aug 15', ndvi: 0.47, ndmi: 0.18 },
    { date: 'Sep 01', ndvi: 0.46, ndmi: 0.17 },
    { date: 'Sep 15', ndvi: 0.45, ndmi: 0.16 },
    { date: 'Sep 30', ndvi: 0.44, ndmi: 0.16 },
    { date: 'Oct 15', ndvi: 0.42, ndmi: 0.14 },
  ],

  // Satellite Observations Log (table data)
  observations: [
    { date: '2023-10-15', sensor: 'Sentinel-2 L2A', status: 'Valid',           ndvi: 0.42, ndmi: 0.14 },
    { date: '2023-10-10', sensor: 'Sentinel-2 L2A', status: 'Valid',           ndvi: 0.38, ndmi: 0.12 },
    { date: '2023-10-05', sensor: 'Sentinel-2 L2A', status: 'Masked: too cloudy', ndvi: null, ndmi: null },
    { date: '2023-09-30', sensor: 'Sentinel-2 L2A', status: 'Valid',           ndvi: 0.45, ndmi: 0.16 },
    { date: '2023-09-25', sensor: 'Sentinel-2 L2A', status: 'Valid',           ndvi: 0.44, ndmi: 0.15 },
  ],
}

// ── REPORT DATA ───────────────────────────────────────────────
// Simulates what a GET /api/report/:id response would look like.
export const MOCK_REPORT = {
  reportId: 'SP-2026-0087',
  generatedDate: 'October 14, 2026',
  analystName: 'Dr. Elena Ross',
  analystTitle: 'Lead Agronomist',

  parcel: {
    name: 'Sector G-12 (North Grove)',
    location: 'Jaén, Andalusia, Spain',
    coordinates: '37.7749° N, 3.7649° W',
    crop: 'Olea europaea (Picual)',
  },

  kpis: {
    meanNdvi: 0.68,
    ndviDelta: +4,
    meanNdmi: 0.42,
    ndmiDelta: -2,
    vegCoverage: 82,
    vegCoverageDelta: +1.5,
  },

  executiveSummary: `Current analysis indicates stable vegetative growth across the North Grove.
A significant 4% increase in mean NDVI since last month suggests optimal photosynthetic activity.
However, moisture levels (NDMI) have decreased by 2%, warranting localized inspection in the southeast
sector where surface temperature anomalies were detected.`,

  // 6-month historical chart data for the report
  historicalData: [
    { month: 'May', ndvi: 0.40, ndmi: 0.25 },
    { month: 'Jun', ndvi: 0.45, ndmi: 0.28 },
    { month: 'Jul', ndvi: 0.52, ndmi: 0.32 },
    { month: 'Aug', ndvi: 0.58, ndmi: 0.36 },
    { month: 'Sep', ndvi: 0.63, ndmi: 0.40 },
    { month: 'Oct', ndvi: 0.68, ndmi: 0.42 },
  ],

  methodology: {
    satellite: 'Sentinel-2A Multispectral Instrument (MSI) with a revisit frequency of 5 days. Atmospheric correction applied via Sen2Cor algorithm.',
    indexCalc: 'NDVI = (NIR − Red) / (NIR + Red). NDMI = (NIR − SWIR) / (NIR + SWIR). Resolution processed at 10m per pixel with sub-pixel interpolation.',
    limitations: 'Vegetation indices are indicators, not direct measurements of olive oil quality, authenticity, disease or irrigation need. Ground-truthing is recommended for anomalies exceeding 5% variance from historical baselines. Cloud cover percentage: 0.2%.',
  },

  certifications: ['ISO 14001 Compliant', 'GIS Standards v4.2'],
}

// ── USER PROFILE ──────────────────────────────────────────────
export const MOCK_USER = {
  name: 'Dr. Elena Ross',
  title: 'Lead Agronomist',
  avatarInitials: 'ER',
}
