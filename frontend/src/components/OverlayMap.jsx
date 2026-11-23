import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { MAP_STYLE } from '../map/mapStyle'
import styles from './OverlayMap.module.css'

setWorkerUrl(mapLibreWorkerUrl)

const OVERLAY_ID = 'index-overlay'
const PARCEL_LAYER_ID = 'parcel-outline'

function getBounds(geometry) {
  const ring = geometry?.coordinates?.[0]
  if (!ring?.length) return null
  let minX = ring[0][0]
  let maxX = minX
  let minY = ring[0][1]
  let maxY = minY
  for (const point of ring) {
    minX = Math.min(minX, point[0])
    maxX = Math.max(maxX, point[0])
    minY = Math.min(minY, point[1])
    maxY = Math.max(maxY, point[1])
  }
  return [[minX, minY], [maxX, maxY]]
}

// overlay = { url, coordinates } | null. syncGroup = shared { maps: [], lock: false } to link cameras.
function OverlayMap({ geometry, overlay, opacity = 0.85, is3D = false, syncGroup, label }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const overlayRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [failedUrl, setFailedUrl] = useState(null)

  useEffect(() => {
    overlayRef.current = overlay
  }, [overlay])

  useEffect(() => {
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [10, 34],
      zoom: 6,
      attributionControl: true,
    })
    mapRef.current = map
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-left')
    map.on('load', () => setIsLoaded(true))
    map.on('error', (event) => {
      if (event?.sourceId === OVERLAY_ID) setFailedUrl(overlayRef.current?.url ?? null)
    })

    // Keep the two maps in compare mode on the same camera.
    map.on('move', () => {
      if (!syncGroup || syncGroup.lock) return
      syncGroup.lock = true
      const camera = {
        center: map.getCenter(),
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      }
      for (const other of syncGroup.maps) {
        if (other !== map) other.jumpTo(camera)
      }
      syncGroup.lock = false
    })
    if (syncGroup) syncGroup.maps.push(map)

    return () => {
      if (syncGroup) {
        const position = syncGroup.maps.indexOf(map)
        if (position >= 0) syncGroup.maps.splice(position, 1)
      }
      map.remove()
      mapRef.current = null
    }
  }, [syncGroup])

  // Parcel outline + initial framing.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isLoaded || !geometry) return
    const data = { type: 'Feature', properties: {}, geometry }
    const source = map.getSource('parcel')
    if (source) {
      source.setData(data)
    } else {
      map.addSource('parcel', { type: 'geojson', data })
      map.addLayer({
        id: PARCEL_LAYER_ID,
        type: 'line',
        source: 'parcel',
        paint: { 'line-color': '#ffffff', 'line-width': 2.5 },
      })
    }
    const bounds = getBounds(geometry)
    if (bounds) map.fitBounds(bounds, { padding: 48, duration: 0, maxZoom: 18 })
  }, [geometry, isLoaded])

  // Index overlay (NDVI / NDMI image for the selected date).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isLoaded) return
    if (!overlay) {
      if (map.getLayer(OVERLAY_ID)) map.removeLayer(OVERLAY_ID)
      if (map.getSource(OVERLAY_ID)) map.removeSource(OVERLAY_ID)
      return
    }
    const source = map.getSource(OVERLAY_ID)
    if (source) {
      source.updateImage({ url: overlay.url, coordinates: overlay.coordinates })
    } else {
      map.addSource(OVERLAY_ID, { type: 'image', url: overlay.url, coordinates: overlay.coordinates })
      map.addLayer(
        {
          id: OVERLAY_ID,
          type: 'raster',
          source: OVERLAY_ID,
          paint: { 'raster-resampling': 'nearest', 'raster-fade-duration': 0 },
        },
        map.getLayer(PARCEL_LAYER_ID) ? PARCEL_LAYER_ID : undefined,
      )
    }
  }, [overlay, isLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (map && isLoaded && map.getLayer(OVERLAY_ID)) {
      map.setPaintProperty(OVERLAY_ID, 'raster-opacity', opacity)
    }
  }, [opacity, overlay, isLoaded])

  // Optional terrain tilt (same terrain source as the parcel-drawing page).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isLoaded) return
    if (is3D) {
      map.setTerrain({ source: 'terrain', exaggeration: 1.2 })
      map.easeTo({ pitch: 55, duration: 600 })
    } else {
      map.setTerrain(null)
      map.easeTo({ pitch: 0, bearing: 0, duration: 600 })
    }
  }, [is3D, isLoaded])

  return (
    <div className={styles.wrapper}>
      {label && <div className={styles.label}>{label}</div>}
      <div ref={containerRef} className={styles.map} />
      {overlay && failedUrl === overlay.url && (
        <div className={styles.error} role="alert">
          Could not load the image for this date. Check the overlay URL returned by the API.
        </div>
      )}
    </div>
  )
}

export default OverlayMap
