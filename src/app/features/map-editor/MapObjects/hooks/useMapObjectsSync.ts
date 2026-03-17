import { useEffect, useMemo, useRef, type RefObject } from 'react'
import type maplibregl from 'maplibre-gl'
import type { ObstacleMeshData, RoofHeatmapFeature, RoofMeshData } from '../../../../../types/geometry'
import { RoofHeatmapLayer } from '../../../../../rendering/roof-layer/RoofHeatmapLayer'
import { buildObstacleLayerGeometry, buildRoofLayerGeometry } from '../../../../../rendering/shared/layerGeometryAdapters'
import { WorldMeshLayer } from '../layers/MapObjectMeshLayer'

interface UseMapObjectsSyncArgs {
  mapRef: RefObject<maplibregl.Map | null>
  mapLoaded: boolean
  roofMeshes: RoofMeshData[]
  obstacleMeshes: ObstacleMeshData[]
  heatmapFeatures: RoofHeatmapFeature[]
  orbitEnabled: boolean
  meshesVisible: boolean
  shadingEnabled: boolean
  shadingComputeState: 'IDLE' | 'SCHEDULED' | 'READY'
}

export function useMapObjectsSync({
  mapRef,
  mapLoaded,
  roofMeshes,
  obstacleMeshes,
  heatmapFeatures,
  orbitEnabled,
  meshesVisible,
  shadingEnabled,
  shadingComputeState,
}: UseMapObjectsSyncArgs): void {
  const roofLayerRef = useRef<WorldMeshLayer | null>(null)
  const obstacleLayerRef = useRef<WorldMeshLayer | null>(null)
  const heatmapLayerRef = useRef<RoofHeatmapLayer | null>(null)
  const roofGeometry = useMemo(() => buildRoofLayerGeometry(roofMeshes, 1), [roofMeshes])
  const obstacleGeometry = useMemo(() => buildObstacleLayerGeometry(obstacleMeshes, 1), [obstacleMeshes])
  const heatmapVisible = orbitEnabled && shadingEnabled && shadingComputeState === 'READY'
  const meshLayersVisible = orbitEnabled && meshesVisible

  useEffect(() => {
    if (!mapLoaded) {
      return
    }

    const map = mapRef.current
    if (!map) {
      return
    }

    const obstacleLayer = new WorldMeshLayer(
      'obstacle-mesh-layer',
      {
        topColorHex: 0x9ca3af,
        wallColorHex: 0x6b7280,
        baseColorHex: 0x4b5563,
      },
      {
        top: true,
        walls: true,
        base: false,
      },
    )
    const roofLayer = new WorldMeshLayer(
      'roof-mesh-layer',
      {},
      {
        top: true,
        walls: false,
        base: false,
      },
    )
    const heatmapLayer = new RoofHeatmapLayer('roof-heatmap-layer')

    map.addLayer(roofLayer)
    map.addLayer(heatmapLayer)
    map.addLayer(obstacleLayer)
    obstacleLayer.setZExaggeration(1)
    roofLayer.setZExaggeration(1)
    heatmapLayer.setZExaggeration(1)

    roofLayerRef.current = roofLayer
    obstacleLayerRef.current = obstacleLayer
    heatmapLayerRef.current = heatmapLayer

    return () => {
      if (map.getLayer(obstacleLayer.id)) {
        map.removeLayer(obstacleLayer.id)
      }
      if (map.getLayer(heatmapLayer.id)) {
        map.removeLayer(heatmapLayer.id)
      }
      if (map.getLayer(roofLayer.id)) {
        map.removeLayer(roofLayer.id)
      }
      roofLayerRef.current = null
      obstacleLayerRef.current = null
      heatmapLayerRef.current = null
    }
  }, [mapLoaded, mapRef])

  useEffect(() => {
    if (!mapLoaded) {
      return
    }
    roofLayerRef.current?.setGeometry(roofGeometry)
  }, [mapLoaded, roofGeometry, roofLayerRef])

  useEffect(() => {
    if (!mapLoaded) {
      return
    }
    obstacleLayerRef.current?.setGeometry(obstacleGeometry)
  }, [mapLoaded, obstacleGeometry, obstacleLayerRef])

  useEffect(() => {
    if (!mapLoaded) {
      return
    }
    heatmapLayerRef.current?.setRoofMeshes(roofMeshes)
  }, [heatmapLayerRef, mapLoaded, roofMeshes])

  useEffect(() => {
    if (!mapLoaded) {
      return
    }
    heatmapLayerRef.current?.setHeatmapFeatures(heatmapFeatures)
  }, [heatmapFeatures, heatmapLayerRef, mapLoaded])

  useEffect(() => {
    if (!mapLoaded) {
      return
    }
    roofLayerRef.current?.setVisible(meshLayersVisible)
    obstacleLayerRef.current?.setVisible(meshLayersVisible)
    heatmapLayerRef.current?.setVisible(heatmapVisible)
  }, [heatmapVisible, mapLoaded, meshLayersVisible])
}
