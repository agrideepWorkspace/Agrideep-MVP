import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  createAnalysis,
  getAnalyses,
  getAnalysisArtifactUrl,
  getParcel,
  getParcels,
} from '../api/parcels'
import ObservationsTable from '../components/ObservationsTable'
import TrendChart from '../components/TrendChart'
import styles from './AnalysisDashboardPage.module.css'

function toDateInputValue(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function initialStartDate() {
  const date = new Date()
  date.setMonth(date.getMonth() - 6)
  return toDateInputValue(date)
}

function SummaryMetric({ label, value, suffix = '' }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value == null ? '—' : `${value}${suffix}`}</strong>
    </div>
  )
}

function AnalysisResult({ job }) {
  const result = job.result
  const summary = result?.summary
  const observations = (result?.observations ?? []).map((observation) => ({
    ...observation,
    status: observation.valid
      ? 'Valid'
      : observation.invalid_reason
        ? `Masked: ${observation.invalid_reason}`
        : 'Invalid',
    sensor: observation.spacecraft || 'Sentinel-2',
  }))
  const chartData = observations
    .filter((observation) => observation.valid)
    .map(({ date, ndvi, ndmi }) => ({ date, ndvi, ndmi }))
  const artifacts = result?.artifacts ?? {}

  if (job.status === 'FAILED') {
    return (
      <section className={styles.resultNotice} role="alert">
        <h3>Analysis failed: {job.errorCode || 'processing_error'}</h3>
        <p>{job.errorMessage || 'The satellite worker could not complete this analysis.'}</p>
        {result?.error?.message && <p>{result.error.message}</p>}
      </section>
    )
  }

  if (job.status !== 'COMPLETED' || !summary) {
    return <p className={styles.muted}>Waiting for satellite results…</p>
  }

  return (
    <div className={styles.result}>
      <div className={styles.metrics}>
        <SummaryMetric label="Mean NDVI" value={summary.ndvi_mean?.toFixed(2)} />
        <SummaryMetric label="Mean NDMI" value={summary.ndmi_mean?.toFixed(2)} />
        <SummaryMetric label="Valid observations" value={summary.n_valid} />
        <SummaryMetric label="Mean cloud cover" value={summary.mean_cloud_pct?.toFixed(1)} suffix="%" />
      </div>

      {result.warnings?.length > 0 && (
        <ul className={styles.warnings}>
          {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}

      {chartData.length > 0 && <TrendChart data={chartData} />}
      {observations.length > 0 && <ObservationsTable observations={observations} />}

      <div className={styles.artifacts}>
        {artifacts.report_pdf && (
          <a href={getAnalysisArtifactUrl(job.id, 'monitoring-report.pdf')} target="_blank" rel="noreferrer">
            Open satellite report (PDF)
          </a>
        )}
        {artifacts.observations_csv && (
          <a href={getAnalysisArtifactUrl(job.id, 'observations.csv')} download>
            Download observations (CSV)
          </a>
        )}
      </div>

      {artifacts.ndvi_map_png && (
        <figure className={styles.mapFigure}>
          <img
            src={getAnalysisArtifactUrl(job.id, 'ndvi-map.png')}
            alt="NDVI map generated from satellite observations"
          />
          <figcaption>Latest NDVI map · Sentinel-2 analysis output</figcaption>
        </figure>
      )}
    </div>
  )
}

function AnalysisDashboardPage() {
  const { id: parcelId } = useParams()
  const [response, setResponse] = useState(null)
  const [retry, setRetry] = useState(0)
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(() => toDateInputValue(new Date()))
  const [today] = useState(() => toDateInputValue(new Date()))
  const [maxCloudPct, setMaxCloudPct] = useState('20')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const requestKey = `${parcelId}:${retry}`

  useEffect(() => {
    const controller = new AbortController()
    if (!parcelId) {
      getParcels(controller.signal).then((parcels) => {
        setResponse({ key: requestKey, parcels })
      }).catch((error) => {
        if (!controller.signal.aborted) setResponse({ key: requestKey, error: error.message })
      })

      return () => controller.abort()
    }

    Promise.all([
      getParcel(parcelId, controller.signal),
      getAnalyses(parcelId, controller.signal),
    ]).then(([parcel, jobs]) => {
      setResponse({ key: requestKey, parcel, jobs })
    }).catch((error) => {
      if (!controller.signal.aborted) setResponse({ key: requestKey, error: error.message })
    })

    return () => controller.abort()
  }, [parcelId, requestKey])

  const currentResponse = response?.key === requestKey ? response : null
  const jobs = currentResponse?.jobs ?? []
  const hasActiveJobs = jobs.some((job) => job.status === 'PENDING' || job.status === 'RUNNING')

  useEffect(() => {
    if (!hasActiveJobs) return undefined

    const timer = window.setInterval(() => {
      getAnalyses(parcelId).then((updatedJobs) => {
        setResponse((current) => current?.key === requestKey
          ? { ...current, jobs: updatedJobs }
          : current)
      }).catch((error) => setSubmitError(`Could not refresh analysis status: ${error.message}`))
    }, 3000)

    return () => window.clearInterval(timer)
  }, [hasActiveJobs, parcelId, requestKey])

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    try {
      const job = await createAnalysis(parcelId, {
        startDate,
        endDate,
        maxCloudPct: Number(maxCloudPct),
      })
      setResponse((current) => current?.key === requestKey
        ? { ...current, jobs: [job, ...current.jobs] }
        : current)
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (currentResponse?.error) {
    return (
      <div className={styles.page}>
        <section className={styles.notice} role="alert">
          <h1>Could not load parcel</h1>
          <p>{currentResponse.error}</p>
          <button className={styles.actionLink} onClick={() => setRetry((value) => value + 1)}>
            Try again
          </button>
        </section>
      </div>
    )
  }

  if (!currentResponse?.parcel) {
    if (!parcelId && currentResponse?.parcels) {
      return (
        <div className={styles.page}>
          <header className={styles.siteHeader}>
            <div className={styles.siteHeaderLeft}>
              <span className={styles.siteTag}>PARCELS</span>
              <h1 className={styles.siteName}>Saved parcels</h1>
              <p className={styles.siteSubtitle}>
                Select a saved parcel to view its analysis history or start a new analysis.
              </p>
            </div>
            <Link className={styles.actionLink} to="/parcels/new">Create parcel</Link>
          </header>
          {currentResponse.parcels.length === 0 ? (
            <section className={styles.notice}>
              <h2>No saved parcels yet</h2>
              <p>Create a parcel to save its boundary and run satellite analyses.</p>
            </section>
          ) : (
            <ul className={styles.parcelList}>
              {currentResponse.parcels.map((savedParcel) => (
                <li className={styles.parcelItem} key={savedParcel.id}>
                  <div>
                    <h2>{savedParcel.name}</h2>
                    <p>
                      {Number(savedParcel.areaHa).toFixed(2)} ha
                      {' · '}
                      {Number(savedParcel.perimeterM).toLocaleString()} m perimeter
                    </p>
                  </div>
                  <Link
                    className={styles.actionLink}
                    to={`/analysis/${encodeURIComponent(savedParcel.id)}`}
                  >
                    Open parcel
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    }
    return <div className={styles.page} role="status">Loading parcel and analysis history…</div>
  }

  const { parcel } = currentResponse

  return (
    <div className={styles.page}>
      <header className={styles.siteHeader}>
        <div className={styles.siteHeaderLeft}>
          <span className={styles.siteTag}>SAVED PARCEL</span>
          <h1 className={styles.siteName}>{parcel.name}</h1>
          <p className={styles.siteSubtitle}>
            {Number(parcel.areaHa).toFixed(2)} ha · {Number(parcel.perimeterM).toLocaleString()} m perimeter
          </p>
        </div>
        <Link className={styles.actionLink} to="/analysis">All parcels</Link>
      </header>

      <section className={styles.analysisFormSection}>
        <h2>Start satellite analysis</h2>
        <p>
          The worker uses Sentinel-2 imagery from Google Earth Engine. Requests need
          configured Earth Engine access; no sample observations are used.
        </p>
        <form className={styles.analysisForm} onSubmit={handleSubmit}>
          <label>
            Start date
            <input type="date" value={startDate} max={endDate} required
              onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label>
            End date
            <input type="date" value={endDate} min={startDate}
              max={today} required
              onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <label>
            Maximum cloud cover
            <span className={styles.cloudInput}>
              <input type="number" value={maxCloudPct} min="0" max="100" step="1" required
                onChange={(event) => setMaxCloudPct(event.target.value)} />
              %
            </span>
          </label>
          <button className={styles.actionLink} type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Start analysis'}
          </button>
        </form>
        {submitError && <p className={styles.error} role="alert">{submitError}</p>}
      </section>

      <section className={styles.jobsSection}>
        <h2>Analysis jobs</h2>
        {jobs.length === 0 ? (
          <p className={styles.muted}>No analysis requests for this parcel yet.</p>
        ) : (
          <div className={styles.jobs}>
            {jobs.map((job) => (
              <article className={styles.jobCard} key={job.id}>
                <header className={styles.jobHeader}>
                  <div>
                    <h3>{job.startDate} – {job.endDate}</h3>
                    <p>Created {new Date(job.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`${styles.jobStatus} ${styles[`status${job.status}`] ?? ''}`}>
                    {job.status}
                  </span>
                </header>
                <AnalysisResult job={job} />
                {job.status === 'COMPLETED' && (
                  <Link className={styles.actionLink} to={`/report/${parcelId}/${job.id}`}>
                    Open report
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default AnalysisDashboardPage
