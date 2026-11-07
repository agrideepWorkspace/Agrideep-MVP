import { useNavigate } from 'react-router-dom'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { MOCK_REPORT } from '../data/mockData'
import styles from './SpatialReportPage.module.css'

function SpatialReportPage() {
  const navigate = useNavigate()
  const { parcel, kpis, historicalData, methodology } = MOCK_REPORT

  function handlePrint() {
    window.print()
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div>
          <p className={styles.eyebrow}>REPORT PREVIEW</p>
          <h1 className={styles.pageTitle}>Spatial Report</h1>
          <p className={styles.pageSubtitle}>Generated analysis for {parcel.name}</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.secondaryButton} onClick={() => navigate(-1)}>
            Back
          </button>
          <button className={styles.primaryButton} onClick={handlePrint}>
            Print or save as PDF
          </button>
        </div>
      </div>

      <article className={styles.report}>
        <header className={styles.reportHeader}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">A</span>
            <div>
              <strong>AgriDeep Grove Monitor</strong>
              <span>SPATIAL ANALYSIS DIVISION</span>
            </div>
          </div>
          <div className={styles.reportId}>
            <span>REPORT ID</span>
            <strong>{MOCK_REPORT.reportId}</strong>
          </div>
        </header>

        <section className={styles.intro}>
          <p className={styles.eyebrow}>VEGETATION MONITORING</p>
          <h2>Vegetation Health &amp; Spatial Analysis</h2>
          <p>Generated {MOCK_REPORT.generatedDate} · Analyst: {MOCK_REPORT.analystName}</p>
        </section>

        <section className={styles.overview}>
          <div>
            <h3 className={styles.sectionTitle}>Site Information</h3>
            <dl className={styles.siteDetails}>
              <div><dt>Parcel name</dt><dd>{parcel.name}</dd></div>
              <div><dt>Location</dt><dd>{parcel.location}</dd></div>
              <div><dt>Coordinates</dt><dd>{parcel.coordinates}</dd></div>
              <div><dt>Crop</dt><dd>{parcel.crop}</dd></div>
            </dl>
          </div>

          <div className={styles.kpiPanel}>
            <h3 className={styles.sectionTitle}>Key Performance Indicators</h3>
            <div className={styles.kpiRow}>
              <span>Mean NDVI</span>
              <strong>{kpis.meanNdvi.toFixed(2)} <small>({kpis.ndviDelta > 0 ? '+' : ''}{kpis.ndviDelta}%)</small></strong>
            </div>
            <div className={styles.kpiRow}>
              <span>Mean NDMI</span>
              <strong>{kpis.meanNdmi.toFixed(2)} <small>({kpis.ndmiDelta > 0 ? '+' : ''}{kpis.ndmiDelta}%)</small></strong>
            </div>
            <div className={styles.kpiRow}>
              <span>Vegetation coverage</span>
              <strong>{kpis.vegCoverage}% <small>({kpis.vegCoverageDelta > 0 ? '+' : ''}{kpis.vegCoverageDelta}%)</small></strong>
            </div>
          </div>
        </section>

        <section className={styles.summary}>
          <h3 className={styles.sectionTitle}>Executive Summary</h3>
          <p>{MOCK_REPORT.executiveSummary}</p>
        </section>

        <section className={styles.chartSection}>
          <h3 className={styles.sectionTitle}>Historical Index Variance</h3>
          <p className={styles.sectionDescription}>Six-month trend comparing vegetation health and moisture</p>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 1]} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ndvi" name="NDVI (Health)" stroke="#2d6a4f" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="ndmi" name="NDMI (Moisture)" stroke="#3995b8" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={styles.methodology}>
          <div>
            <h3 className={styles.sectionTitle}>Methodology Details</h3>
            <dl className={styles.methodList}>
              <div><dt>Satellite constellation</dt><dd>{methodology.satellite}</dd></div>
              <div><dt>Index calculation</dt><dd>{methodology.indexCalc}</dd></div>
            </dl>
            <h3 className={styles.sectionTitle}>Technical Certifications</h3>
            <div className={styles.certifications}>
              {MOCK_REPORT.certifications.map((certification) => (
                <span key={certification}>{certification}</span>
              ))}
            </div>
          </div>
          <aside className={styles.limits}>
            <h3>Report limitations</h3>
            <p>{methodology.limitations}</p>
          </aside>
        </section>

        <footer className={styles.reportFooter}>
          <span>© 2026 AgriDeep · Satellite analysis for informed decisions</span>
          <span>{MOCK_REPORT.reportId}</span>
        </footer>
      </article>
    </div>
  )
}

export default SpatialReportPage
