// ============================================================
// src/components/HeatmapPanel.jsx — SPATIAL HEATMAP SIDEBAR
// ============================================================
//
// WHAT IT DOES:
// Shows the NDVI spatial heatmap thumbnail on the dashboard:
//   - Aerial satellite image with "LATEST" badge
//   - Color scale bar (red=stress → green=health)
//   - "Open Interactive Map" button
//
// REACT CONCEPTS:
//   ✅ useNavigate hook — programmatic navigation
//   ✅ Props with default values
// ============================================================

import { useNavigate } from 'react-router-dom'
// useNavigate() returns a `navigate` function.
// Calling navigate('/some-path') pushes a new URL onto the history stack.
// This is the programmatic alternative to clicking a <Link> component.
// Use it when you need to navigate AFTER some logic (e.g., form submit).

import styles from './HeatmapPanel.module.css'

function HeatmapPanel({ imageUrl, parcelId }) {
  const navigate = useNavigate()

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Spatial Heatmap</h3>
          <p className={styles.subtitle}>Current NDVI distribution preview</p>
        </div>
      </div>

      {/* MAP IMAGE */}
      <div className={styles.mapWrapper}>
        <img
          src={imageUrl || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80'}
          alt="NDVI Spatial Heatmap"
          className={styles.mapImg}
        />
        <span className={styles.latestBadge}>LATEST</span>
      </div>

      {/* COLOR SCALE BAR */}
      <div className={styles.scaleSection}>
        <div className={styles.scaleHeader}>
          <span className={styles.scaleLabel}>INDEX SCALE</span>
        </div>
        <div className={styles.scaleBar} />
        <div className={styles.scaleRange}>
          <span>Low (Stress)</span>
          <span>High (Health)</span>
        </div>
      </div>

      {/* OPEN MAP BUTTON */}
      <button
        className={styles.mapBtn}
        onClick={() => navigate(parcelId ? `/report/${encodeURIComponent(parcelId)}` : '/report')}
      >
        View Spatial Report
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
    </div>
  )
}

export default HeatmapPanel
