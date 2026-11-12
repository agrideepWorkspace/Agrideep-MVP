import { Link, useLocation } from 'react-router-dom'
import styles from './Topbar.module.css'

function getPageTitle(pathname) {
  if (pathname === '/parcels/new') return 'New parcel'
  if (pathname.startsWith('/analysis/')) return 'Parcel details'
  if (pathname === '/analysis') return 'Saved parcels'
  if (pathname.startsWith('/report/')) return 'Report availability'
  if (pathname === '/report') return 'Reports'
  return 'AgriDeep'
}

function Topbar() {
  const { pathname } = useLocation()
  const pageTitle = getPageTitle(pathname)

  return (
    <header className={styles.topbar}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link className={styles.breadcrumbHome} to="/analysis">Parcels</Link>
        <span className={styles.breadcrumbSep} aria-hidden="true">›</span>
        <span className={styles.breadcrumbCurrent}>{pageTitle}</span>
      </nav>
    </header>
  )
}

export default Topbar
