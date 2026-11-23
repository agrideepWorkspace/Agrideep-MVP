import { keycloak } from '../auth.js'
import styles from './AuthScreen.module.css'

function Brand({ compact = false }) {
  return (
    <div className={`${styles.brand} ${compact ? styles.compactBrand : ''}`}>
      <span className={styles.brandMark} aria-hidden="true">A</span>
      <span>AgriDeep</span>
    </div>
  )
}

function AuthScreen({ error = '' }) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.story} aria-label="AgriDeep orchard monitoring">
          <Brand />
          <div className={styles.storyCopy}>
            <span className={styles.kicker}>ORCHARD INTELLIGENCE</span>
            <h1>A clearer view of every field.</h1>
            <p>Monitor orchard health with satellite insights, season after season.</p>
          </div>
          <div className={styles.fieldCard} aria-hidden="true">
            <svg viewBox="0 0 360 170" role="presentation">
              <path d="M4 131 53 102 92 116 139 68 177 81 225 31 278 48 355 9" />
              <path d="M4 157 53 128 92 142 139 94 177 107 225 57 278 74 355 35" />
              <path d="M4 105 53 76 92 90 139 42 177 55 225 5 278 22 355-13" />
              <path d="M31 0 71 170M103 0l40 170M177 0l40 170M251 0l40 170" />
            </svg>
            <span className={styles.fieldLabel}><i /> FIELD INSIGHTS</span>
          </div>
          <p className={styles.storyFooter}>Better decisions begin with a better view.</p>
        </section>

        <section className={styles.access} aria-labelledby="auth-title">
          <div className={styles.mobileBrand}><Brand compact /></div>
          <div className={styles.formContent}>
            <span className={styles.formKicker}>{error ? 'CONNECTION STATUS' : 'YOUR FARM WORKSPACE'}</span>
            <h2 id="auth-title">{error ? 'We could not connect' : 'Welcome to AgriDeep'}</h2>
            <p className={styles.description}>
              {error || 'Sign in or create an account to manage your parcels and monitor your orchards.'}
            </p>

            {error ? (
              <button className={styles.primaryButton} onClick={() => window.location.reload()}>
                Try again
              </button>
            ) : (
              <>
                <button className={styles.primaryButton} onClick={() => keycloak.login()}>
                  Sign in
                  <span aria-hidden="true">→</span>
                </button>
                <div className={styles.divider}><span>New to AgriDeep?</span></div>
                <button className={styles.secondaryButton} onClick={() => keycloak.register()}>
                  Create an account
                </button>
              </>
            )}
          </div>
          <p className={styles.privacy}><span aria-hidden="true">●</span> Your farm workspace is private to you.</p>
        </section>
      </div>
    </main>
  )
}

export default AuthScreen
