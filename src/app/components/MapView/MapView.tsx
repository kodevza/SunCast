import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { FootprintPolygon, RoofMeshData } from '../../../types/geometry'
import { RoofMeshLayer } from '../../../rendering/roof-layer/RoofMeshLayer'

interface MapViewProps {
  footprint: FootprintPolygon | null
  drawDraft: Array<[number, number]>
  isDrawing: boolean
  orbitEnabled: boolean
  onToggleOrbit: () => void
  roofMesh: RoofMeshData | null
  showSolveHint: boolean
  onMapClick: (point: [number, number]) => void
}

const SATELLITE_TILES =
  'https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

function toRing(vertices: Array<[number, number]>): Array<[number, number]> {
  if (vertices.length < 3) {
    return vertices
  }
  return [...vertices, vertices[0]]
}

type MapFeature = GeoJSON.Feature<GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon>

const ORBIT_PITCH_DEG = 60
const ORBIT_BEARING_DEG = -20
const MAX_ORBIT_PITCH_DEG = 85

function toBounds(vertices: Array<[number, number]>): maplibregl.LngLatBoundsLike {
  let minLon = vertices[0][0]
  let minLat = vertices[0][1]
  let maxLon = vertices[0][0]
  let maxLat = vertices[0][1]

  for (const [lon, lat] of vertices) {
    minLon = Math.min(minLon, lon)
    minLat = Math.min(minLat, lat)
    maxLon = Math.max(maxLon, lon)
    maxLat = Math.max(maxLat, lat)
  }

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ]
}

export function MapView({
  footprint,
  drawDraft,
  isDrawing,
  orbitEnabled,
  onToggleOrbit,
  roofMesh,
  showSolveHint,
  onMapClick,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const roofLayerRef = useRef<RoofMeshLayer | null>(null)
  const drawingRef = useRef(isDrawing)
  const onClickRef = useRef(onMapClick)
  const footprintRef = useRef(footprint)
  const draftRef = useRef(drawDraft)
  const roofMeshRef = useRef(roofMesh)

  useEffect(() => {
    drawingRef.current = isDrawing
  }, [isDrawing])

  useEffect(() => {
    onClickRef.current = onMapClick
  }, [onMapClick])

  useEffect(() => {
    footprintRef.current = footprint
  }, [footprint])

  useEffect(() => {
    draftRef.current = drawDraft
  }, [drawDraft])

  useEffect(() => {
    roofMeshRef.current = roofMesh
  }, [roofMesh])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      canvasContextAttributes: {
        antialias: true,
      },
      style: {
        version: 8,
        sources: {
          satellite: {
            type: 'raster',
            tiles: [SATELLITE_TILES],
            tileSize: 256,
            attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
          },
          footprint: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
          draft: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
        },
        layers: [
          { id: 'satellite', type: 'raster', source: 'satellite' },
          {
            id: 'footprint-fill',
            type: 'fill',
            source: 'footprint',
            paint: {
              'fill-color': '#e5b422',
              'fill-opacity': 0.2,
            },
          },
          {
            id: 'footprint-line',
            type: 'line',
            source: 'footprint',
            paint: {
              'line-color': '#f7cc52',
              'line-width': 2,
            },
          },
          {
            id: 'draft-line',
            type: 'line',
            source: 'draft',
            paint: {
              'line-color': '#ff6b6b',
              'line-width': 2,
              'line-dasharray': [2, 1],
            },
          },
          {
            id: 'draft-points',
            type: 'circle',
            source: 'draft',
            paint: {
              'circle-color': '#ff6b6b',
              'circle-radius': 4,
            },
          },
        ],
      },
      center: [-73.989, 40.733],
      zoom: 18,
      pitch: 0,
      bearing: 0,
      maxPitch: MAX_ORBIT_PITCH_DEG,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.on('load', () => {
      const roofLayer = new RoofMeshLayer('roof-mesh-layer')
      roofLayerRef.current = roofLayer
      map.addLayer(roofLayer)

      const footprintSource = map.getSource('footprint') as maplibregl.GeoJSONSource | undefined
      if (footprintSource && footprintRef.current) {
        footprintSource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [toRing(footprintRef.current.vertices)],
              },
            },
          ],
        })
      }

      const draftSource = map.getSource('draft') as maplibregl.GeoJSONSource | undefined
      if (draftSource) {
        const features: MapFeature[] = []
        if (draftRef.current.length >= 2) {
          features.push({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: draftRef.current,
            },
          })
        }
        for (const point of draftRef.current) {
          features.push({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: point,
            },
          })
        }
        draftSource.setData({ type: 'FeatureCollection', features })
      }

      roofLayer.setMesh(roofMeshRef.current)
    })

    map.on('click', (event) => {
      if (!drawingRef.current) {
        return
      }
      onClickRef.current([event.lngLat.lng, event.lngLat.lat])
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      roofLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) {
      return
    }

    const source = map.getSource('footprint') as maplibregl.GeoJSONSource | undefined
    if (!source) {
      return
    }

    if (!footprint) {
      source.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    source.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [toRing(footprint.vertices)],
          },
        },
      ],
    })
  }, [footprint])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) {
      return
    }

    const source = map.getSource('draft') as maplibregl.GeoJSONSource | undefined
    if (!source) {
      return
    }

    const features: MapFeature[] = []

    if (drawDraft.length >= 2) {
      features.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: drawDraft,
        },
      })
    }

    for (const point of drawDraft) {
      features.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: point,
        },
      })
    }

    source.setData({
      type: 'FeatureCollection',
      features,
    })
  }, [drawDraft])

  useEffect(() => {
    roofLayerRef.current?.setMesh(roofMesh)
  }, [roofMesh])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    if (!orbitEnabled) {
      map.dragRotate.disable()
      map.touchZoomRotate.disableRotation()
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 350,
      })
      return
    }

    map.dragRotate.enable()
    map.touchZoomRotate.enableRotation()

    const hasFootprint = footprint && footprint.vertices.length >= 3
    if (hasFootprint) {
      map.fitBounds(toBounds(footprint.vertices), {
        padding: 80,
        duration: 500,
        bearing: ORBIT_BEARING_DEG,
        pitch: ORBIT_PITCH_DEG,
        maxZoom: 20,
      })
      return
    }

    map.easeTo({
      pitch: ORBIT_PITCH_DEG,
      bearing: ORBIT_BEARING_DEG,
      duration: 500,
    })
  }, [footprint, orbitEnabled])

  return (
    <div className="map-root-wrap">
      <div ref={containerRef} className="map-root" />
      <button type="button" className="map-orbit-toggle" onClick={onToggleOrbit}>
        {orbitEnabled ? 'Exit orbit' : 'Orbit'}
      </button>
      {orbitEnabled && showSolveHint && footprint && (
        <div className="map-hint">Add heights to solve plane</div>
      )}
    </div>
  )
}
