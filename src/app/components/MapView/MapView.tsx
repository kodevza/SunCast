import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { FootprintPolygon, RoofMeshData } from '../../../types/geometry'
import { RoofMeshLayer } from '../../../rendering/roof-layer/RoofMeshLayer'

interface MapViewProps {
  footprint: FootprintPolygon | null
  drawDraft: Array<[number, number]>
  isDrawing: boolean
  roofMesh: RoofMeshData | null
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

export function MapView({ footprint, drawDraft, isDrawing, roofMesh, onMapClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const roofLayerRef = useRef<RoofMeshLayer | null>(null)
  const drawingRef = useRef(isDrawing)
  const onClickRef = useRef(onMapClick)
  const footprintRef = useRef(footprint)
  const draftRef = useRef(drawDraft)

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
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
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
      pitch: 55,
      bearing: -20,
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

      roofLayer.setMesh(roofMesh)
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
  }, [roofMesh])

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

  return <div ref={containerRef} className="map-root" />
}
