import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getParcel } from '../api/parcels'
import { getObservations, toOverlay } from '../api/observations'
import OverlayMap from '../components/OverlayMap'
import TrendChart from '../components/TrendChart'
import styles from './ParcelMapPage.module.css'

const LAYERS = [
  { id: 'satellite', label: 'Satellite', hint: 'Reference photo only (not from the selected date).' },
  { id: 'ndvi', label: 'Greenness', hint: 'Vegetation activity (NDVI). Includes ground cover, not just tree health.' },
  { id: 'ndmi', label: 'Moisture', hint: 'Canopy water content (NDMI). Not an irrigation recommendation.' },
]

function formatDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ParcelMapPage() {
  const { parcelId } = useParams()
  const [retry, setRetry] = useState(0)
  const [state, setState] = useState(null)
  const [layer, setLayer] = useState('ndvi')
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [compareOn, setCompareOn] = useState(false)
  const [compareSelected, setCompareSelected] = useState(null)
  const [opacity, setOpacity] = useState(0.85)
  const [is3D, setIs3D] = useState(false)
  const [syncGroup] = useState(() => ({ maps: [], lock: false }))
  const requestKey = `${parcelId}:${retry}`

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getParcel(parcelId, controller.signal),
      getObservations(parcelId, controller.signal),
    ])
      .then(([parcel, observations]) => setState({ key: requestKey, parcel, observations }))
      .catch((error) => {
        if (!controller.signal.aborted) setState({ key: requestKey, error: error.message })
      })
    return () => controller.abort()
  }, [parcelId, requestKey])

  const current = state?.key === requestKey ? state : null
  const timeline = useMemo(() => current?.observations ?? [], [current])
  const lastIndex = timeline.length - 1
  const index = Math.max(Math.min(selectedIndex ?? lastIndex, lastIndex), 0)
  const compareIndex = Math.max(Math.min(compareSelected ?? index - 1, lastIndex), 0)
  const observation = timeline[index]
  const compareObservation = timeline[compareIndex]

  const overlay = useMemo(
    () => (layer === 'satellite' ? null : toOverlay(observation, layer)),
    [layer, observation],
  )
  const compareOverlay = useMemo(
    () => (layer === 'satellite' ? null : toOverlay(compareObservation, layer)),
    [layer, compareObservation],
  )
  const chartData = useMemo(
    () => timeline.map((item) => ({ date: item.date, ndvi: item.ndvi.mean, ndmi: item.ndmi.mean })),
    [timeline],
  )

  if (!current) {
    return <div className={styles.page} role="status">Loading parcel map…</div>
  }

  if (current.error) {
    return (
      <div className={styles.page}>
        <section className={styles.notice} role="alert">
          <h1>Could not load the map data</h1>
          <p>{current.error}</p>
          <button className={styles.button} onClick={() => setRetry((value) => value + 1)}>Try again</button>
        </section>
      </div>
    )
  }

  if (timeline.length === 0) {
    return (
      <div className={styles.page}>
        <section className={styles.notice}>
          <h1>{current.parcel.name}</h1>
          <p>No clear satellite dates yet. Run an analysis for this parcel first.</p>
          <Link className={styles.button} to={`/analysis/${parcelId}`}>Start analysis</Link>
        </section>
      </div>
    )
  }

  const layerInfo = LAYERS.find((item) => item.id === layer)
  const showMissingNotice = layer !== 'satellite' && !overlay

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>PARCEL MAP</p>
          <h1 className={styles.title}>{current.parcel.name}</h1>
          <p className={styles.subtitle}>
            {Number(current.parcel.areaHa).toFixed(2)} ha · {timeline.length} clear satellite dates
          </p>
        </div>
        <Link className={styles.buttonSecondary} to={`/analysis/${parcelId}`}>Update analysis</Link>
      </header>

      <section className={styles.controls}>
        <div className={styles.segmented} role="group" aria-label="Map layer">
          {LAYERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={layer === item.id}
              className={layer === item.id ? styles.segmentActive : styles.segment}
              onClick={() => setLayer(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className={styles.toggle}>
          <input type="checkbox" checked={is3D} onChange={(event) => setIs3D(event.target.checked)} />
          Tilt (3D terrain)
        </label>
        <label className={styles.toggle}>
          <input type="checkbox" checked={compareOn} onChange={(event) => setCompareOn(event.target.checked)} />
          Compare two dates
        </label>
        <label className={styles.toggle}>
          Opacity
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(event) => setOpacity(Number(event.target.value))}
          />
        </label>
      </section>
      <p className={styles.hint}>{layerInfo.hint}</p>

      <div className={compareOn ? styles.mapsTwo : styles.mapsOne}>
        {compareOn && (
          <OverlayMap
            geometry={current.parcel.geometry}
            overlay={compareOverlay}
            opacity={opacity}
            is3D={is3D}
            syncGroup={syncGroup}
            label={formatDate(compareObservation.date)}
          />
        )}
        <OverlayMap
          geometry={current.parcel.geometry}
          overlay={overlay}
          opacity={opacity}
          is3D={is3D}
          syncGroup={syncGroup}
          label={formatDate(observation.date)}
        />
      </div>

      {showMissingNotice && (
        <p className={styles.warning} role="status">
          No image for this date and layer. If every date shows this, check the field names in
          src/api/observations.js against the API response.
        </p>
      )}

      <section className={styles.dateBar}>
        <button
          type="button"
          className={styles.stepButton}
          disabled={index <= 0}
          onClick={() => setSelectedIndex(index - 1)}
          aria-label="Previous date"
        >
          ‹
        </button>
        <input
          className={styles.slider}
          type="range"
          min="0"
          max={lastIndex}
          value={index}
          onChange={(event) => setSelectedIndex(Number(event.target.value))}
          aria-label="Selected date"
        />
        <button
          type="button"
          className={styles.stepButton}
          disabled={index >= lastIndex}
          onClick={() => setSelectedIndex(index + 1)}
          aria-label="Next date"
        >
          ›
        </button>
        <div className={styles.dateInfo}>
          <strong>{formatDate(observation.date)}</strong>
          {observation.validPixelPct !== null && (
            <span>{Math.round(observation.validPixelPct)}% of the parcel clear</span>
          )}
        </div>
        {compareOn && (
          <label className={styles.compareSelect}>
            Left map date
            <select value={compareIndex} onChange={(event) => setCompareSelected(Number(event.target.value))}>
              {timeline.map((item, position) => (
                <option key={item.id} value={position}>{formatDate(item.date)}</option>
              ))}
            </select>
          </label>
        )}
      </section>

      {overlay && (
        <section className={styles.legend}>
          <div className={layer === 'ndvi' ? styles.barGreen : styles.barBlue} />
          <div className={styles.legendLabels}>
            <span>{layer === 'ndvi' ? 'Less green' : 'Drier'}</span>
            <span>{layer === 'ndvi' ? 'Greener' : 'More moisture'}</span>
          </div>
          <p className={styles.legendNote}>
            Colors are scaled to this parcel across all dates, so dates can be compared.
            {overlay.lo !== null && overlay.hi !== null && (
              <> Technical range: {overlay.lo.toFixed(2)} to {overlay.hi.toFixed(2)}.</>
            )}
          </p>
        </section>
      )}

      <section className={styles.chartCard}>
        <TrendChart data={chartData} />
      </section>
    </div>
  )
}

export default ParcelMapPage
