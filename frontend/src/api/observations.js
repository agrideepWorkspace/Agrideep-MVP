import { API_BASE_URL, requestJson } from '../api'

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function toUrl(value) {
  if (typeof value !== 'string') return null
  if (value.startsWith('http')) return value
  if (value.startsWith('/')) return `${API_BASE_URL}${value}`
  return null
}

// MapLibre image source needs 4 [lon, lat] corners: top-left, top-right, bottom-right, bottom-left.
function toCorners(value) {
  if (!Array.isArray(value) || value.length !== 4) return null
  const corners = value.map((pair) =>
    Array.isArray(pair) ? [toNumber(pair[0]), toNumber(pair[1])] : null)
  return corners.every((pair) => pair && pair[0] !== null && pair[1] !== null) ? corners : null
}

function readIndex(raw, name, sharedCorners) {
  const statistics = raw[name]
  return {
    mean: toNumber(statistics?.mean),
    overlayUrl: toUrl(raw[`${name}OverlayUrl`]),
    corners: sharedCorners,
    lo: toNumber(raw[`${name}Lo`]),
    hi: toNumber(raw[`${name}Hi`]),
  }
}

export function normalizeObservation(raw, _parcelId) {
  const id = raw.id
  const date = raw.acquisitionDate
  const sharedCorners = toCorners(raw.overlayCoordinates)

  return {
    id,
    date: typeof date === 'string' ? date.slice(0, 10) : null,
    valid: raw.valid,
    validPixelPct: toNumber(raw.validPixelPct),
    ndvi: readIndex(raw, 'ndvi', sharedCorners),
    ndmi: readIndex(raw, 'ndmi', sharedCorners),
  }
}

export async function getObservations(parcelId, signal) {
  const body = await requestJson(
    `/parcels/${encodeURIComponent(parcelId)}/observations?validOnly=true`,
    { signal },
  )
  const list = Array.isArray(body) ? body : body?.observations
  if (!Array.isArray(list)) throw new Error('The observations API returned an invalid list.')
  return list
    .map((raw) => normalizeObservation(raw, parcelId))
    .filter((observation) => observation.id && observation.date && observation.valid)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function toOverlay(observation, indexName) {
  const info = observation?.[indexName]
  if (!info?.overlayUrl || !info.corners) return null
  return { url: info.overlayUrl, coordinates: info.corners, lo: info.lo, hi: info.hi }
}
