import { useState } from 'react'
import styles from './ParcelSetupPanel.module.css'

function ParcelSetupPanel({
  areaHa = null,
  perimeterM = null,
  boundarySet = false,
  onSave,
  isSaving = false,
  saveError = '',
}) {
  const [parcelName, setParcelName] = useState('')

  function handleSave() {
    if (!boundarySet) {
      return
    }
    onSave?.({ parcelName })
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>Save a parcel</h2>
          <p className={styles.panelSubtitle}>Name and save the drawn boundary.</p>
        </div>
        {boundarySet && <span className="badge badge--success">Boundary defined</span>}
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>AREA ESTIMATE</span>
          <span className={styles.statValue}>
            {areaHa != null ? `${areaHa.toFixed(2)} ha` : '—'}
          </span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>PERIMETER ESTIMATE</span>
          <span className={styles.statValue}>
            {perimeterM != null ? `${perimeterM} m` : '—'}
          </span>
        </div>
      </div>

      <div className={styles.divider} />

      <section className={styles.section}>
        <label className={styles.fieldLabel} htmlFor="parcel-name">Parcel name</label>
        <input
          id="parcel-name"
          type="text"
          className={styles.input}
          value={parcelName}
          onChange={(event) => setParcelName(event.target.value)}
          placeholder="Enter a parcel name"
          maxLength={120}
          required
        />
        <p className={styles.hint}>
          The backend will validate the boundary and calculate the saved area and perimeter.
        </p>
      </section>

      <div className={styles.actions}>
        {saveError && <p className={styles.saveError} role="alert">{saveError}</p>}
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={isSaving || !boundarySet}
        >
          {isSaving ? 'Saving parcel…' : 'Save parcel'}
        </button>
        <p className={styles.hint}>
          Satellite analysis is not connected yet. Saving a parcel will not start an analysis.
        </p>
      </div>
    </aside>
  )
}

export default ParcelSetupPanel
