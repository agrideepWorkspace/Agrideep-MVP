// ============================================================
// src/components/ObservationsTable.jsx — SATELLITE LOG TABLE
// ============================================================
//
// REACT CONCEPTS:
//   ✅ useState — local filter state
//   ✅ Derived data — filtering an array without storing it in state
//   ✅ Conditional rendering — null values shown as "—"
//   ✅ .map() to render table rows
// ============================================================

import { useState } from 'react'
// useState is a React "Hook" — a special function that lets a
// functional component remember values between renders.
//
// const [value, setValue] = useState(initialValue)
//   - `value`    → the current state (read-only in JSX)
//   - `setValue` → function to UPDATE the state
//   - When setValue() is called, React RE-RENDERS the component
//     with the new value. This is what makes the UI reactive.

import styles from './ObservationsTable.module.css'

// Status badge — maps status string to a visual badge
function StatusBadge({ status }) {
  // Pick the right badge style based on the status string
  let cls = 'badge badge--info'
  if (status === 'Valid')             cls = 'badge badge--success'
  if (status.startsWith('Masked'))    cls = 'badge badge--warning'

  return <span className={cls}>{status}</span>
}

// PROPS: observations → array of row objects from mockData
function ObservationsTable({ observations = [] }) {
  // ── LOCAL STATE: active status filter ─────────────────────
  // `filter` holds the currently selected filter: 'All', 'Valid', or 'Masked'
  // It starts as 'All' (no filter).
  const [filter, setFilter] = useState('All')
  // When the user clicks a filter button, we call setFilter('Valid')
  // → React re-renders this component → `filter` is now 'Valid'
  // → `filteredRows` recalculates → only Valid rows show

  // ── DERIVED DATA (not state!) ──────────────────────────────
  // We don't store `filteredRows` in useState — it's DERIVED from
  // `observations` and `filter`. Every render, we recalculate it.
  // Rule of thumb: if you can calculate it from existing state/props,
  // DON'T put it in state. Keep state minimal.
  const filteredRows = filter === 'All'
    ? observations
    : observations.filter(row =>
        filter === 'Valid'
          ? row.status === 'Valid'
          : row.status !== 'Valid'
      )

  const filters = ['All', 'Valid', 'Masked']

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Satellite Observations Log</h3>
          <p className={styles.subtitle}>Historical sensor readings</p>
        </div>
        {/* FILTER BUTTONS */}
        <div className={styles.filters}>
          {filters.map(f => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>DATE</th>
              <th>SENSOR</th>
              <th>STATUS</th>
              <th>NDVI</th>
              <th>NDMI</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              // index as key is acceptable here since rows don't reorder
              <tr key={index} className={styles.row}>
                <td className={styles.date}>{row.date}</td>
                <td className={styles.sensor}>{row.sensor}</td>
                <td><StatusBadge status={row.status} /></td>
                {/* null values display as "—" (em dash) */}
                <td className={styles.numeric}>
                  {row.ndvi != null ? row.ndvi.toFixed(2) : '—'}
                </td>
                <td className={styles.numeric}>
                  {row.ndmi != null ? row.ndmi.toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className={styles.loadMore}>Load More Observations</button>
    </div>
  )
}

export default ObservationsTable
