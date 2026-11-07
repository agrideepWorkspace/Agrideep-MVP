// ============================================================
// src/pages/AnalysisDashboardPage.jsx — SCREEN 2: DASHBOARD
// ============================================================
//
// WHAT IT DOES: The main analysis view showing:
//   - Site header (parcel name, area & perimeter, date range, status badge)
//   - 3 KPI cards (NDVI, NDMI, Cloud Coverage)
//   - NDVI/NDMI line chart (left) + Heatmap panel (right)
//   - Satellite Observations Log table
//
// For a saved parcel (/analysis/<id from the API>), the name, area and
// perimeter come from GET /parcels/:id. Everything else is still mock data.
//
// REACT CONCEPTS:
//   ✅ Importing and composing multiple components
//   ✅ Passing props down to children
//   ✅ useParams + useEffect to load the saved parcel
//   ✅ Data flows top-down (parent → children via props)
// ============================================================

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { requestJson } from '../api'
import KpiCard           from '../components/KpiCard'
import TrendChart        from '../components/TrendChart'
import HeatmapPanel      from '../components/HeatmapPanel'
import ObservationsTable from '../components/ObservationsTable'
import { MOCK_ANALYSIS, MOCK_PARCELS } from '../data/mockData'

import styles from './AnalysisDashboardPage.module.css'

// ── SMALL INLINE SVG ICONS used for KPI card icons ────────────
function IconLeaf({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
    </svg>
  )
}
function IconDroplet({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  )
}
function IconCloud({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  )
}

// ── PAGE COMPONENT ────────────────────────────────────────────
function AnalysisDashboardPage() {
  // Use mock data (replace with API call later)
  const data = MOCK_ANALYSIS

  // Mock ids such as "olive-grove-a" keep the sample parcel; any other id was saved through the API.
  const { id } = useParams()
  const isSavedParcel = id != null && !MOCK_PARCELS.some(parcel => parcel.id === id)
  const [loaded, setLoaded] = useState({ id: null, parcel: null, error: '' })

  useEffect(() => {
    if (!isSavedParcel) return undefined

    // Ignores a response that arrives after the user has moved to another parcel.
    let ignore = false
    requestJson(`/parcels/${encodeURIComponent(id)}`)
      .then(parcel => { if (!ignore) setLoaded({ id, parcel, error: '' }) })
      .catch(error => { if (!ignore) setLoaded({ id, parcel: null, error: error.message }) })
    return () => { ignore = true }
  }, [id, isSavedParcel])

  const parcel = loaded.id === id ? loaded.parcel : null
  const loadError = loaded.id === id ? loaded.error : ''
  let parcelName = data.parcelName
  let subtitle = data.subtitle
  if (isSavedParcel) {
    parcelName = parcel?.name ?? (loadError ? 'Parcel unavailable' : 'Loading parcel…')
    if (loadError) subtitle = `Could not load parcel: ${loadError}`
  }

  return (
    // The Topbar here overrides the one in App.jsx's layout by passing
    // page-specific props. The one in App.jsx is the "global" topbar —
    // but since Topbar is also rendered here, this one takes its place.
    // Actually: we skip the global topbar for this page since it's already
    // rendered in App.jsx. We just use the page-specific content below.
    <div className={styles.page}>

      {/* ── SITE HEADER ─────────────────────────────────── */}
      <div className={styles.siteHeader}>
        <div className={styles.siteHeaderLeft}>
          <span className={styles.siteTag}>🌿 SITE ANALYSIS</span>
          <h1 className={styles.siteName}>{parcelName}</h1>
          <p className={styles.siteSubtitle} role={loadError ? 'alert' : undefined}>{subtitle}</p>
        </div>
        <div className={styles.siteHeaderRight}>
          {/* Measured by the backend, so it can differ slightly from the estimate shown while drawing */}
          {parcel && (
            <div className={styles.parcelSize}>
              📐 {parcel.areaHa.toFixed(2)} ha · {parcel.perimeterM} m
            </div>
          )}
          <div className={styles.dateRange}>
            📅 {data.dateRange}
          </div>
          <span className="badge badge--success">● {data.status}</span>
        </div>
      </div>

      {/* ── CONTENT GRID ─────────────────────────────────── */}
      <div className={styles.contentGrid}>

        {/* LEFT COLUMN: KPI cards + chart + table */}
        <div className={styles.leftCol}>

          {/* KPI CARDS ROW */}
          <div className={styles.kpiRow}>
            {/*
              We pass data as PROPS to KpiCard.
              KpiCard doesn't know where the data comes from.
              It just renders whatever props it receives.
              This makes KpiCard completely reusable across pages.
            */}
            <KpiCard
              title="Mean NDVI"
              value={data.meanNdvi}
              delta={data.ndviDelta}
              icon={<IconLeaf size={16} />}
            />
            <KpiCard
              title="Mean NDMI"
              value={data.meanNdmi}
              delta={data.ndmiDelta}
              icon={<IconDroplet size={16} />}
            />
          </div>

          {/* TREND CHART */}
          {/*
            We pass `data.trendData` as the `data` prop to TrendChart.
            TrendChart receives it as: function TrendChart({ data }) { ... }
            Props flow ONE WAY: parent → child. Never child → parent directly.
            (For child→parent communication, you pass a callback function as prop)
          */}
          <TrendChart data={data.trendData} />

          {/* OBSERVATIONS TABLE */}
          <ObservationsTable observations={data.observations} />
        </div>

        {/* RIGHT COLUMN: Cloud coverage card + heatmap */}
        <div className={styles.rightCol}>
          <KpiCard
            title="Cloud Coverage"
            value={data.cloudCoverage}
            unit="%"
            icon={<IconCloud size={16} />}
            dark={true}
          />
          {/* The HeatmapPanel shows the satellite image + color scale */}
          <HeatmapPanel parcelId="olive-grove-a" />
        </div>
      </div>
    </div>
  )
}

export default AnalysisDashboardPage
