// ============================================================
// src/components/ParcelSetupPanel.jsx — RIGHT PANEL (MAP SCREEN)
// ============================================================
//
// WHAT IT DOES:
// The right-side configuration panel on the Parcel Selection screen:
//   - Shows area/perimeter stats (passed from map)
//   - Form: parcel name, crop type, date range
//   - Toggles: NDVI / NDMI analysis
//   - "Save & Run Analysis" button
//
// REACT CONCEPTS:
//   ✅ Controlled inputs — form fields whose value is driven by state
//   ✅ Multiple useState calls — one per piece of state
//   ✅ Lifting state up — parent passes `areaHa` / `perimeterM` from map
//   ✅ onChange handler — syncing input text to state in real time
//   ✅ Toggle (boolean) state
// ============================================================

import { useState } from 'react'
import styles from './ParcelSetupPanel.module.css'

// ── TOGGLE SWITCH ─────────────────────────────────────────────
// A reusable ON/OFF toggle component.
// PROPS:
//   checked  → current boolean value (true=on)
//   onChange → function called when toggled
//   id       → unique HTML id (links label to input for accessibility)
function Toggle({ checked, onChange, id }) {
  return (
    <label className={styles.toggleLabel} htmlFor={id}>
      {/*
        This is a CONTROLLED checkbox.
        `checked={checked}` → React controls the visual state (not the browser)
        `onChange={onChange}` → when clicked, calls parent's handler
        Without onChange, React would warn: "controlled input without onChange handler"
      */}
      <input
        id={id}
        type="checkbox"
        className={styles.toggleInput}
        checked={checked}
        onChange={onChange}
      />
      <span className={styles.toggleTrack}>
        <span className={styles.toggleThumb} />
      </span>
    </label>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────
// PROPS:
//   areaHa       → number from the map (polygon area in hectares)
//   perimeterM   → number from the map (polygon perimeter in meters)
//   boundarySet  → boolean — has the user drawn a polygon?
//   onSave       → function called when "Save & Run Analysis" is clicked
function ParcelSetupPanel({
  areaHa = null,
  perimeterM = null,
  boundarySet = false,
  onSave,
}) {
  // ── FORM STATE ──────────────────────────────────────────────
  // Each useState manages ONE piece of state.
  // React calls this component function every time any of these change.
  // After re-render, React updates ONLY the DOM parts that actually changed
  // (this is the "Virtual DOM diffing" React is famous for).

  const [parcelName, setParcelName]   = useState('North Grove Sector A')
  const [cropType, setCropType]       = useState('Olive Orchard (Mediterranean)')
  const [startDate, setStartDate]     = useState('2023-10-01')
  const [endDate, setEndDate]         = useState('2024-03-31')
  const [ndviEnabled, setNdviEnabled] = useState(true)
  const [ndmiEnabled, setNdmiEnabled] = useState(false)

  // ── SUBMIT HANDLER ──────────────────────────────────────────
  // This function runs when the user clicks "Save & Run Analysis".
  // It packages all state into one object and calls the `onSave` prop.
  // This is "lifting state up" — the child (this panel) informs
  // the parent (ParcelSelectionPage) of the final values.
  function handleSave() {
    if (!boundarySet) {
      alert('Please draw a boundary on the map first.')
      return
    }
    // Call the parent's handler with all form data
    onSave?.({
      parcelName,
      cropType,
      startDate,
      endDate,
      ndviEnabled,
      ndmiEnabled,
      areaHa,
      perimeterM,
    })
  }

  return (
    <aside className={styles.panel}>
      {/* HEADER */}
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>Parcel Setup</h2>
          <p className={styles.panelSubtitle}>Configure boundary &amp; analysis parameters</p>
        </div>
        {boundarySet && (
          <span className="badge badge--success">✓ Boundary Defined</span>
        )}
      </div>

      {/* STATS: area + perimeter */}
      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>TOTAL AREA</span>
          <span className={styles.statValue}>
            {areaHa != null ? `${areaHa.toFixed(2)} ha` : '—'}
          </span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>PERIMETER</span>
          <span className={styles.statValue}>
            {perimeterM != null ? `${perimeterM} m` : '—'}
          </span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* GENERAL INFO */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>📍</span> General Information
        </h3>

        <label className={styles.fieldLabel}>Parcel Name</label>
        {/*
          CONTROLLED INPUT:
          value={parcelName}           → input shows what's in state
          onChange={e => setParcelName(e.target.value)}
            → every keystroke: e.target.value is the new text
            → setParcelName updates state → React re-renders → input reflects new text
          This loop: type → onChange → setState → re-render → new value shown
          is the foundation of React forms.
        */}
        <input
          type="text"
          className={styles.input}
          value={parcelName}
          onChange={e => setParcelName(e.target.value)}
          placeholder="Enter parcel name"
        />

        <label className={styles.fieldLabel}>Crop Type</label>
        <select
          className={styles.input}
          value={cropType}
          onChange={e => setCropType(e.target.value)}
        >
          <option>Olive Orchard (Mediterranean)</option>
          <option>Wheat (Winter)</option>
          <option>Vineyard</option>
          <option>Almond Orchard</option>
          <option>Citrus Grove</option>
        </select>
      </section>

      <div className={styles.divider} />

      {/* ANALYSIS PERIOD */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>📅</span> Analysis Period
          <button className={styles.historyBtn}>History</button>
        </h3>
        <div className={styles.dateRow}>
          <div className={styles.dateField}>
            <label className={styles.fieldLabel}>Start Date</label>
            <input type="date" className={styles.input}
              value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className={styles.dateField}>
            <label className={styles.fieldLabel}>End Date</label>
            <input type="date" className={styles.input}
              value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <p className={styles.hint}>
          ℹ Satellite analysis will be performed using Sentinel-2 L2A imagery with &lt;10% cloud cover.
        </p>
      </section>

      <div className={styles.divider} />

      {/* MONITORING INDICES */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>📈</span> Monitoring Indices
        </h3>

        {/* NDVI Toggle Card */}
        <div className={`${styles.indexCard} ${ndviEnabled ? styles.indexCardActive : ''}`}>
          <div className={styles.indexCardHeader}>
            <div className={styles.indexInfo}>
              <span className={styles.indexIcon}>📊</span>
              <div>
                <p className={styles.indexName}>NDVI Analysis</p>
                <p className={styles.indexDesc}>Vegetation Vigor &amp; Density</p>
              </div>
            </div>
            <Toggle
              id="ndvi-toggle"
              checked={ndviEnabled}
              onChange={() => setNdviEnabled(prev => !prev)}
              // prev => !prev is the "functional updater" form of setState.
              // It receives the PREVIOUS state value and returns the new value.
              // Safer than `setNdviEnabled(!ndviEnabled)` when state updates are batched.
            />
          </div>
          {ndviEnabled && (
            <div className={styles.previewMap}>
              <img
                src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=300&q=70"
                alt="NDVI preview"
                className={styles.previewImg}
              />
              <span className={styles.previewLabel}>Preview Map</span>
            </div>
          )}
        </div>

        {/* NDMI Toggle Card */}
        <div className={`${styles.indexCard} ${ndmiEnabled ? styles.indexCardActive : ''}`}>
          <div className={styles.indexCardHeader}>
            <div className={styles.indexInfo}>
              <span className={styles.indexIcon}>💧</span>
              <div>
                <p className={styles.indexName}>NDMI Analysis</p>
                <p className={styles.indexDesc}>Plant Water Stress Monitor</p>
              </div>
            </div>
            <Toggle
              id="ndmi-toggle"
              checked={ndmiEnabled}
              onChange={() => setNdmiEnabled(prev => !prev)}
            />
          </div>
        </div>
      </section>

      {/* ACTION BUTTONS */}
      <div className={styles.actions}>
        <button className={styles.saveBtn} onClick={handleSave}>
          💾 Save Parcel &amp; Run Analysis
        </button>
        <button className={styles.cancelBtn}>Cancel Changes</button>
        <p className={styles.versionTag}>AGRIDEEP V2.4.0 • SCIENCE CORE ENGINE</p>
      </div>
    </aside>
  )
}

export default ParcelSetupPanel
