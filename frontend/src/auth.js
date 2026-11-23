import Keycloak from 'keycloak-js'

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'agrideep',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'agrideep-frontend',
})

export async function initializeAuth() {
  return keycloak.init({
    onLoad: 'check-sso',
    pkceMethod: 'S256',
    checkLoginIframe: false,
  })
}

export async function authorizedFetch(url, options = {}) {
  const headers = new Headers(options.headers || {})
  if (keycloak.authenticated) {
    await keycloak.updateToken(30)
    headers.set('Authorization', `Bearer ${keycloak.token}`)
  }
  return fetch(url, { ...options, headers })
}
