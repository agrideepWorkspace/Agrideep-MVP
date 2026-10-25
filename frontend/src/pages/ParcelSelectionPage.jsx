import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'

import ParcelSetupPanel from '../components/ParcelSetupPanel'
import styles from './ParcelSelectionPage.module.css'

const INITIAL_CENTER = [-3.7849, 37.7749]
const EARTH_RADIUS_M = 6371008.8
const EMPTY_FEATURE_COLLECTION = { type: 'FeatureCollection', features: [] }

setWorkerUrl(mapLibreWorkerUrl)

const MAP_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
    terrain: {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      tileSize: 256,
      encoding: 'terrarium',
      maxzoom: 15,
      attribution: 'Elevation data &copy; AWS Terrain Tiles',
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
}

function getPolygonMeasurements(ring) {
  let area = 0
  let perimeter = 0

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [longitude1, latitude1] = ring[index]
    const [longitude2, latitude2] = ring[index + 1]
    const lat1 = latitude1 * Math.PI / 180
    const lat2 = latitude2 * Math.PI / 180
    const deltaLongitude = (longitude2 - longitude1) * Math.PI / 180
    const deltaLatitude = (latitude2 - latitude1) * Math.PI / 180

    area += deltaLongitude * (2 + Math.sin(lat1) + Math.sin(lat2))
    const haversine = Math.sin(deltaLatitude / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLongitude / 2) ** 2
    perimeter += 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(haversine))
  }

  return {
    areaHa: +(Math.abs(area * EARTH_RADIUS_M ** 2 / 2) / 10000).toFixed(2),
    perimeterM: Math.round(perimeter),
  }
}

function makeMapFeatures(boundary, points) {
  const features = []

  if (boundary) features.push(boundary)
  if (points.length > 1) {
    features.push({
      type: 'Feature',
      properties: { role: 'sketch' },
      geometry: { type: 'LineString', coordinates: points },
    })
  }
  points.forEach((coordinates) => {
    features.push({
      type: 'Feature',
      properties: { role: 'vertex' },
      geometry: { type: 'Point', coordinates },
    })
  })

  return { type: 'FeatureCollection', features }
}

function ParcelSelectionPage() {
  const navigate = useNavigate()
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const drawingRef = useRef(false)
  const pointsRef = useRef([])
  const boundaryRef = useRef(null)
  const [boundary, setBoundary] = useState(false)
  const [areaHa, setAreaHa] = useState(null)
  const [perimeterM, setPerimeterM] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [is3D, setIs3D] = useState(false)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [mapError, setMapError] = useState('')
  const [drawMessage, setDrawMessage] = useState('')

  const syncFeatures = useCallback(() => {
    const source = mapRef.current?.getSource('parcel-geometry')
    if (source) source.setData(makeMapFeatures(boundaryRef.current, pointsRef.current))
  }, [])

  const finishDrawing = useCallback(() => {
    if (!drawingRef.current) return

    const map = mapRef.current
    drawingRef.current = false
    setIsDrawing(false)
    if (map) {
      map.doubleClickZoom.enable()
      map.getCanvas().style.cursor = ''
    }

    const points = pointsRef.current.filter((point, index, allPoints) => {
      if (index === 0) return true
      const previous = allPoints[index - 1]
      return Math.abs(point[0] - previous[0]) > 1e-10
        || Math.abs(point[1] - previous[1]) > 1e-10
    })

    if (points.length < 3) {
      setDrawMessage('Add at least three corners to create a boundary.')
      pointsRef.current = []
      syncFeatures()
      return
    }

    const ring = [...points, points[0]]
    const polygon = {
      type: 'Feature',
      properties: { role: 'boundary' },
      geometry: { type: 'Polygon', coordinates: [ring] },
    }
    const measurements = getPolygonMeasurements(ring)
    boundaryRef.current = polygon
    pointsRef.current = []
    setBoundary(true)
    setAreaHa(measurements.areaHa)
    setPerimeterM(measurements.perimeterM)
    setDrawMessage('')
    syncFeatures()
  }, [syncFeatures])

  useEffect(() => {
    if (!mapContainerRef.current) return undefined

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: INITIAL_CENTER,
      zoom: 15,
      attributionControl: true,
    })
    mapRef.current = map
    map.addControl(new NavigationControl(), 'top-left')

    map.on('load', () => {
      map.addSource('parcel-geometry', {
        type: 'geojson',
        data: EMPTY_FEATURE_COLLECTION,
      })
      map.addLayer({
        id: 'parcel-fill',
        type: 'fill',
        source: 'parcel-geometry',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#2D6A4F', 'fill-opacity': 0.2 },
      })
      map.addLayer({
        id: 'parcel-line',
        type: 'line',
        source: 'parcel-geometry',
        filter: ['any', ['==', ['geometry-type'], 'LineString'], ['==', ['geometry-type'], 'Polygon']],
        paint: { 'line-color': '#2D6A4F', 'line-width': 3 },
      })
      map.addLayer({
        id: 'parcel-vertices',
        type: 'circle',
        source: 'parcel-geometry',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 5,
          'circle-color': '#FFFFFF',
          'circle-stroke-color': '#2D6A4F',
          'circle-stroke-width': 2,
        },
      })
      syncFeatures()
      setIsMapLoaded(true)
    })

    map.on('click', (event) => {
      if (!drawingRef.current) return
      pointsRef.current = [...pointsRef.current, [event.lngLat.lng, event.lngLat.lat]]
      setDrawMessage('')
      syncFeatures()
    })

    map.on('error', (event) => {
      if (event.error) setMapError(event.error.message)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [syncFeatures])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapLoaded) return

    if (is3D) {
      map.setTerrain({ source: 'terrain', exaggeration: 1.5 })
      map.easeTo({ pitch: 60, duration: 700 })
    } else {
      map.setTerrain(null)
      map.easeTo({ pitch: 0, bearing: 0, duration: 700 })
    }
  }, [is3D, isMapLoaded])

  function startDrawing() {
    pointsRef.current = []
    drawingRef.current = true
    setIsDrawing(true)
    setDrawMessage('')
    mapRef.current?.doubleClickZoom.disable()
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'crosshair'
    syncFeatures()
  }

  function cancelDrawing() {
    drawingRef.current = false
    pointsRef.current = []
    setIsDrawing(false)
    setDrawMessage('')
    mapRef.current?.doubleClickZoom.enable()
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = ''
    syncFeatures()
  }

  function clearBoundary() {
    boundaryRef.current = null
    setBoundary(false)
    setAreaHa(null)
    setPerimeterM(null)
    syncFeatures()
  }

  function handleSave(_formData) {
    navigate('/analysis/olive-grove-a')
  }

  return (
    <div className={styles.page}>
      <div className={styles.mapArea}>
        <div ref={mapContainerRef} className={styles.map} />

        {mapError && (
          <div className={styles.mapNotice} role="status">
            Map tiles may be temporarily unavailable. Check your connection and provider usage terms.
          </div>
        )}

        <div className={styles.drawToolbar}>
          {isDrawing ? (
            <>
              <button className={styles.mapControlButton} onClick={finishDrawing}>
                Finish boundary
              </button>
              <button className={styles.mapControlButton} onClick={cancelDrawing}>
                Cancel
              </button>
            </>
          ) : (
            <button className={styles.mapControlButton} onClick={startDrawing}>
              {boundary ? 'Redraw boundary' : 'Draw boundary'}
            </button>
          )}
          {boundary && !isDrawing && (
            <button className={styles.mapControlButton} onClick={clearBoundary}>
              Clear boundary
            </button>
          )}
        </div>

        {isDrawing && (
          <div className={styles.drawHint}>
            Click the map to add corners, then choose “Finish boundary”.
          </div>
        )}
        {drawMessage && <div className={styles.drawHint}>{drawMessage}</div>}

        <div className={styles.mapFooter}>
          <div className={styles.mapTabs} aria-label="Map display mode">
            <button
              className={`${styles.mapTab} ${!is3D ? styles.mapTabActive : ''}`}
              aria-pressed={!is3D}
              onClick={() => setIs3D(false)}
            >
              Satellite
            </button>
            <button
              className={`${styles.mapTab} ${is3D ? styles.mapTabActive : ''}`}
              aria-pressed={is3D}
              onClick={() => setIs3D(true)}
            >
              3D terrain
            </button>
          </div>
          <span className={styles.mapNote}>
            {is3D ? 'Terrain elevation · no 3D buildings' : 'Esri satellite imagery'}
          </span>
        </div>
      </div>

      <ParcelSetupPanel
        areaHa={areaHa}
        perimeterM={perimeterM}
        boundarySet={boundary}
        onSave={handleSave}
      />
    </div>
  )
}

export default ParcelSelectionPage
