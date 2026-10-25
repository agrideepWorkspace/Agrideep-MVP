// ============================================================
// src/pages/AnalysisDashboardPage.jsx — SCREEN 2: DASHBOARD
// ============================================================
//
// WHAT IT DOES: The main analysis view showing:
//   - Site header (parcel name, date range, status badge)
//   - 3 KPI cards (NDVI, NDMI, Cloud Coverage)
//   - NDVI/NDMI line chart (left) + Heatmap panel (right)
//   - Satellite Observations Log table
//
// REACT CONCEPTS:
//   ✅ Importing and composing multiple components
//   ✅ Passing props down to children
//   ✅ useNavigate to wire "Export Report" button
//   ✅ Data flows top-down (parent → children via props)
// ============================================================

import KpiCard           from '../components/KpiCard'
import TrendChart        from '../components/TrendChart'
import HeatmapPanel      from '../components/HeatmapPanel'
import ObservationsTable from '../components/ObservationsTable'
import { MOCK_ANALYSIS } from '../data/mockData'

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
          <h1 className={styles.siteName}>{data.parcelName}</h1>
          <p className={styles.siteSubtitle}>{data.subtitle}</p>
        </div>
        <div className={styles.siteHeaderRight}>
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
