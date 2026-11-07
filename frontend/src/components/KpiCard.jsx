// ============================================================
// src/components/KpiCard.jsx — KEY PERFORMANCE INDICATOR CARD
// ============================================================
//
// COMPONENT TYPE: Pure Presentational Component
//
// WHAT IS A "PURE" COMPONENT?
// A pure component has NO state and NO side effects.
// It's just: props IN → JSX OUT. Always the same output for the same input.
// Pure components are the easiest to understand, test, and reuse.
//
// WHAT IT RENDERS:
// A single white card showing one metric, e.g.:
//   ┌────────────────────────────┐
//   │ Mean NDVI            🌿   │
//   │ 0.42                       │
//   │ ↘ 12.5%  vs last month    │
//   └────────────────────────────┘
//
// REACT CONCEPTS:
//   ✅ Props destructuring with default values
//   ✅ Conditional rendering (delta positive vs negative)
//   ✅ Dynamic className based on prop value
//   ✅ Passing children (the icon slot)
// ============================================================

import styles from './KpiCard.module.css'

// ── DELTA ARROW HELPER ────────────────────────────────────────
// A tiny helper component (not exported — only used inside this file).
// It renders the colored delta percentage row.
//
// `delta` is a number like -12.5 or +4.0
// Negative → red arrow down. Positive → green arrow up.
function DeltaRow({ delta, label = 'vs last month' }) {
  // `delta` can be null/undefined if data is unavailable
  if (delta === null || delta === undefined) return null

  const isPositive = delta >= 0
  const sign       = isPositive ? '+' : ''  // manual sign for positive numbers
  const colorClass = isPositive ? styles.deltaPositive : styles.deltaNegative

  return (
    <div className={`${styles.delta} ${colorClass}`}>
      {/* Inline SVG arrow — direction flips based on sign */}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        {isPositive
          ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
          : <><line x1="12" y1="5"  x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>
        }
      </svg>
      <span className={styles.deltaValue}>{sign}{Math.abs(delta)}%</span>
      <span className={styles.deltaLabel}>{label}</span>
    </div>
  )
}

// ── KPICARD COMPONENT ─────────────────────────────────────────
//
// PROPS:
//   title    → card label, e.g. "Mean NDVI"
//   value    → the big number shown, e.g. 0.42
//   delta    → percentage change, e.g. -12.5
//   icon     → JSX element (SVG) passed from parent: icon={<LeafIcon />}
//   unit     → optional unit suffix, e.g. "%", "ha"
//   dark     → boolean: if true, renders dark card variant (cloud coverage)
//
// CHILDREN vs ICON PROP:
// We use `icon` as a named prop (not children) so the parent can pass
// any SVG/element while keeping the card's internal structure predictable.
function KpiCard({ title, value, delta, icon, unit = '', dark = false }) {
  return (
    <div className={`${styles.card} ${dark ? styles.cardDark : ''}`}>
      {/* HEADER ROW: title on left, icon on right */}
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {/*
          The `icon` prop is just a JSX element (React element).
          We render it directly — React elements are just objects,
          so passing them as props is perfectly valid.
          This pattern is called "render props" (a simplified form).
        */}
        {icon && <div className={styles.iconSlot}>{icon}</div>}
      </div>

      {/* THE BIG VALUE */}
      <div className={styles.value}>
        {value !== null && value !== undefined ? value : '—'}
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>

      {/* DELTA ROW */}
      <DeltaRow delta={delta} />
    </div>
  )
}

export default KpiCard
