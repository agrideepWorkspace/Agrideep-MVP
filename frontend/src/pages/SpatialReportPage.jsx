import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { getAnalyses, getAnalysis, getAnalysisArtifactUrl, getParcel, getParcels } from '../api/parcels'
import ObservationsTable from '../components/ObservationsTable'
import TrendChart from '../components/TrendChart'
import styles from './SpatialReportPage.module.css'

function SpatialReportPage() {
  const { parcelId, jobId } = useParams()
  const navigate = useNavigate()
  const [response, setResponse] = useState(null)
  const [retry, setRetry] = useState(0)
  const requestKey = `${parcelId ?? ''}:${jobId ?? ''}:${retry}`

  useEffect(() => {
    const controller = new AbortController()
    let load
    if (jobId) {
      load = getAnalysis(jobId, controller.signal).then((job) => {
        if (job.parcelId !== parcelId) {
          throw new Error('This analysis does not belong to the requested parcel.')
        }
        setResponse({ key: requestKey, job })
      })
    } else if (parcelId) {
      load = Promise.all([
        getParcel(parcelId, controller.signal),
        getAnalyses(parcelId, controller.signal),
      ]).then(([parcel, jobs]) => setResponse({ key: requestKey, parcel, jobs }))
    } else {
      load = getParcels(controller.signal).then((parcels) => setResponse({ key: requestKey, parcels }))
    }

    load.catch((error) => {
      if (!controller.signal.aborted) setResponse({ key: requestKey, error: error.message })
    })

    return () => controller.abort()
  }, [parcelId, jobId, requestKey])

  const currentResponse = response?.key === requestKey ? response : null
  const error = currentResponse?.error
  const data = currentResponse?.job
  const results = data?.result
  const summary = results?.summary
  const observations = (results?.observations ?? []).map((observation) => ({
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
  const artifacts = results?.artifacts ?? {}

  function handlePrint() {
    window.print()
  }

  if (error) {
    return (
      <div className={styles.page}>
        <section className={styles.notice} role="alert">
          <h1>Could not load report data</h1>
          <p>{error}</p>
          <button className={styles.primaryButton} onClick={() => setRetry((value) => value + 1)}>
            Try again
          </button>
        </section>
      </div>
    )
  }

  if (!currentResponse) {
    return <div className={styles.page} role="status">Loading report data from the API…</div>
  }

  if (!parcelId && currentResponse.parcels) {
    return (
      <div className={styles.page}>
        <header className={styles.toolbar}>
          <div>
            <p className={styles.eyebrow}>REPORTS</p>
            <h1 className={styles.pageTitle}>Choose a parcel</h1>
            <p className={styles.pageSubtitle}>Select a parcel to view its real analysis jobs.</p>
          </div>
        </header>
        {currentResponse.parcels.length === 0 ? (
          <section className={styles.notice}>
            <h2>No saved parcels</h2>
            <Link className={styles.primaryButton} to="/parcels/new">Create a parcel</Link>
          </section>
        ) : (
          <ul className={styles.parcelList}>
            {currentResponse.parcels.map((parcel) => (
              <li className={styles.parcelItem} key={parcel.id}>
                <div>
                  <h2>{parcel.name}</h2>
                  <p>{Number(parcel.areaHa).toFixed(2)} ha</p>
                </div>
                <Link className={styles.primaryButton} to={`/report/${parcel.id}`}>
                  View analysis jobs
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  if (parcelId && !jobId && currentResponse.jobs) {
    return (
      <div className={styles.page}>
        <header className={styles.toolbar}>
          <div>
            <p className={styles.eyebrow}>REPORTS</p>
            <h1 className={styles.pageTitle}>{currentResponse.parcel.name}</h1>
            <p className={styles.pageSubtitle}>Select a completed analysis to view its report.</p>
          </div>
          <div className={styles.actions}>
            <button className={styles.secondaryButton} onClick={() => navigate(-1)}>Back</button>
            <Link className={styles.primaryButton} to={`/analysis/${parcelId}`}>Start analysis</Link>
          </div>
        </header>
        {currentResponse.jobs.length === 0 ? (
          <section className={styles.notice}>
            <h2>No analysis jobs</h2>
            <p>Start a satellite analysis for this parcel to generate a report.</p>
          </section>
        ) : (
          <ul className={styles.parcelList}>
            {currentResponse.jobs.map((job) => (
              <li className={styles.parcelItem} key={job.id}>
                <div>
                  <h2>{job.startDate} – {job.endDate}</h2>
                  <p>Status: {job.status}{job.errorMessage ? ` · ${job.errorMessage}` : ''}</p>
                </div>
                {job.status === 'COMPLETED' && (
                  <Link className={styles.primaryButton} to={`/report/${parcelId}/${job.id}`}>
                    Open report
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div>
          <p className={styles.eyebrow}>SATELLITE REPORT</p>
          <h1 className={styles.pageTitle}>{data.parcelName}</h1>
          <p className={styles.pageSubtitle}>{data.startDate} – {data.endDate}</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.secondaryButton} onClick={() => navigate(-1)}>Back</button>
          {data.status === 'COMPLETED' && (
            <button className={styles.primaryButton} onClick={handlePrint}>Print or save as PDF</button>
          )}
        </div>
      </div>

      <article className={styles.report}>
        <header className={styles.reportHeader}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">A</span>
            <div>
              <strong>AgriDeep Satellite Monitoring</strong>
              <span>REAL WORKER OUTPUT</span>
            </div>
          </div>
          <div className={styles.reportId}>
            <span>ANALYSIS JOB</span>
            <strong>{data.id}</strong>
            <span>STATUS: {data.status}</span>
          </div>
        </header>

        {data.status === 'PENDING' || data.status === 'RUNNING' ? (
          <section className={styles.notice}>
            <h2>Analysis is {data.status.toLowerCase()}</h2>
            <p>The satellite worker has not finished this job. Refresh this page to check for results.</p>
          </section>
        ) : data.status === 'FAILED' ? (
          <section className={styles.notice} role="alert">
            <h2>Analysis failed: {data.errorCode || 'processing_error'}</h2>
            <p>{data.errorMessage || 'The satellite worker could not complete this analysis.'}</p>
          </section>
        ) : (
          <>
            <section className={styles.intro}>
              <p className={styles.eyebrow}>SENTINEL-2 VEGETATION MONITORING</p>
              <h2>{data.parcelName}</h2>
              <p>Analysis period: {data.startDate} – {data.endDate}</p>
            </section>

            {summary && (
              <section className={styles.kpiPanel}>
                <h3 className={styles.sectionTitle}>Summary from satellite observations</h3>
                <div className={styles.summaryGrid}>
                  <div><span>Mean NDVI</span><strong>{summary.ndvi_mean?.toFixed(2) ?? '—'}</strong></div>
                  <div><span>Mean NDMI</span><strong>{summary.ndmi_mean?.toFixed(2) ?? '—'}</strong></div>
                  <div><span>Valid observations</span><strong>{summary.n_valid ?? '—'}</strong></div>
                  <div><span>Mean cloud cover</span><strong>{summary.mean_cloud_pct?.toFixed(1) ?? '—'}%</strong></div>
                </div>
              </section>
            )}

            {results?.warnings?.length > 0 && (
              <section className={styles.notice}>
                <h3 className={styles.sectionTitle}>Processing notes</h3>
                <ul>{results.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
              </section>
            )}

            {chartData.length > 0 && <TrendChart data={chartData} />}
            {observations.length > 0 && <ObservationsTable observations={observations} />}

            {artifacts.ndvi_map_png && (
              <figure className={styles.mapFigure}>
                <img
                  src={getAnalysisArtifactUrl(data.id, 'ndvi-map.png')}
                  alt="NDVI map generated from Sentinel-2 data"
                />
                <figcaption>NDVI map generated by the satellite worker</figcaption>
              </figure>
            )}

            <section className={styles.artifacts}>
              <h3 className={styles.sectionTitle}>Generated files</h3>
              {artifacts.report_pdf && (
                <a href={getAnalysisArtifactUrl(data.id, 'monitoring-report.pdf')} target="_blank" rel="noreferrer">
                  Open generated PDF report
                </a>
              )}
              {artifacts.observations_csv && (
                <a href={getAnalysisArtifactUrl(data.id, 'observations.csv')} download>
                  Download observations CSV
                </a>
              )}
              {!artifacts.report_pdf && !artifacts.observations_csv && (
                <p>No downloadable artifacts were returned by the worker.</p>
              )}
            </section>

            {results?.metadata && (
              <section className={styles.methodology}>
                <h3 className={styles.sectionTitle}>Processing metadata</h3>
                <dl>
                  <div><dt>Source</dt><dd>{results.metadata.source}</dd></div>
                  <div><dt>Processing scale</dt><dd>{results.metadata.processing_scale_m} m</dd></div>
                  <div><dt>Maximum cloud coverage</dt><dd>{results.metadata.max_cloud_pct}%</dd></div>
                </dl>
              </section>
            )}
          </>
        )}
      </article>
    </div>
  )
}

export default SpatialReportPage
