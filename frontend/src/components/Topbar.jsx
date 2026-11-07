// ============================================================
// src/components/Topbar.jsx — TOP NAVIGATION BAR
// ============================================================
//
// COMPONENT TYPE: Presentational (receives data via props)
//
// WHAT IT DOES:
// Renders the horizontal bar at the top of the main content area with:
//   - Breadcrumb navigation (Dashboard > Orchard Analysis)
//   - Search input field
//   - Filter, notification, share, export-report buttons
//
// REACT CONCEPTS IN THIS FILE:
//   ✅ Props — parent passes `breadcrumb` text as a prop
//   ✅ Default prop values — what to show if no prop is passed
//   ✅ Event handlers — onClick for buttons
//   ✅ Conditional rendering with ternary operator
// ============================================================

import styles from './Topbar.module.css'

// ── INLINE SVG ICONS ──────────────────────────────────────────
function IconSearch({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function IconFilter({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  )
}

function IconBell({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

function IconShare({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  )
}

function IconDownload({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function IconHome({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

// ── TOPBAR COMPONENT ──────────────────────────────────────────
//
// PROPS EXPLANATION:
// The Topbar receives props from its parent to know:
//   - What to show in the breadcrumb (which page are we on?)
//   - What happens when "Export Report" is clicked
//
// Props are like function arguments for components.
// Parent: <Topbar pageTitle="Orchard Analysis" onExport={handleExport} />
// Child:  function Topbar({ pageTitle, onExport }) { ... }
//
// DEFAULT PARAMETER VALUES:
// If a parent doesn't pass `pageTitle`, we use 'Orchard Analysis' as default.
// This is standard JavaScript default parameter syntax — not React-specific.
function Topbar({ pageTitle = 'Orchard Analysis', onExport }) {
  return (
    <header className={styles.topbar}>
      {/* LEFT: BREADCRUMB */}
      <div className={styles.breadcrumb}>
        <span className={styles.breadcrumbHome}>
          <IconHome size={14} />
          <span>Dashboard</span>
        </span>
        {/* The › separator */}
        <span className={styles.breadcrumbSep}>›</span>
        {/*
          CONDITIONAL RENDERING with ternary operator:
          condition ? valueIfTrue : valueIfFalse

          If pageTitle exists → show it. Otherwise show a fallback.
          This is the most common way to conditionally render in React JSX.
          (You can't use if/else directly inside JSX — you need expressions)
        */}
        <span className={styles.breadcrumbCurrent}>
          {pageTitle ? pageTitle : 'Orchard Analysis'}
        </span>
      </div>

      {/* CENTER: SEARCH BAR */}
      <div className={styles.searchWrapper}>
        <IconSearch size={15} />
        <input
          type="text"
          placeholder="Search parcels, reports..."
          className={styles.searchInput}
          aria-label="Search"
        />
      </div>

      {/* RIGHT: ACTION BUTTONS */}
      <div className={styles.actions}>
        {/* Icon-only buttons with tooltips via title attribute */}
        <button className={styles.iconBtn} title="Filter">
          <IconFilter size={16} />
        </button>
        <button className={styles.iconBtn} title="Notifications">
          <IconBell size={16} />
          {/* Notification dot — always shown for demo */}
          <span className={styles.notifDot} />
        </button>
        <button className={styles.iconBtn} title="Share">
          <IconShare size={16} />
          <span className={styles.btnLabel}>Share</span>
        </button>

        {/*
          The Export Report button calls `onExport` when clicked.
          `onExport` is passed from the parent — it could be:
          - a navigation function (go to report page)
          - trigger a download
          - open a modal

          The || (() => {}) is a fallback: if onExport wasn't passed,
          clicking won't crash — it just does nothing.
          Better approach in real apps: use PropTypes or TypeScript to enforce props.
        */}
        <button
          className={styles.exportBtn}
          onClick={onExport || (() => {})}
        >
          <IconDownload size={15} />
          Export Report
        </button>
      </div>
    </header>
  )
}

export default Topbar
