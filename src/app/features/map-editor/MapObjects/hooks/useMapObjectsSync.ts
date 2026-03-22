import { useEffect, useMemo, useRef, type RefObject } from 'react'
import type maplibregl from 'maplibre-gl'
import type { ObstacleMeshData, RoofMeshData } from '../../../../../types/geometry'
import type { BinaryShadedCell } from '../../../../analysis/analysis.types'
import type { ComputeRoofShadeGridResult } from '../../../../../geometry/shading'
import { buildObstacleLayerGeometry, buildRoofLayerGeometry } from '../../../../../rendering/shared/layerGeometryAdapters'
import { WorldMeshLayer } from '../layers/MapObjectMeshLayer'
import { ProjectedBinaryShadeLayer } from '../layers/ProjectedBinaryShadeLayer'

interface UseMapObjectsSyncArgs {
  mapRef: RefObject<maplibregl.Map | null>
  mapLoaded: boolean
  roofMeshes: RoofMeshData[]
  obstacleMeshes: ObstacleMeshData[]
  shadingMode: 'live-shading' | 'annual-sun-access' | 'none'
  shadingCells: BinaryShadedCell[]
  shadingResult: ComputeRoofShadeGridResult | null
  orbitEnabled: boolean
  meshesVisible: boolean
  shadingEnabled: boolean
  shadingComputeState: 'IDLE' | 'PENDING' | 'STALE' | 'READY'
}

export function useMapObjectsSync({
  mapRef,
  mapLoaded,
  roofMeshes,
  obstacleMeshes,
  shadingMode,
  shadingCells,
  shadingResult,
  orbitEnabled,
  meshesVisible,
  shadingEnabled,
  shadingComputeState,
}: UseMapObjectsSyncArgs): void {
  const roofLayerRef = useRef<WorldMeshLayer | null>(null)
  const obstacleLayerRef = useRef<WorldMeshLayer | null>(null)
  const shadeLayerRef = useRef<ProjectedBinaryShadeLayer | null>(null)
  const roofGeometry = useMemo(() => buildRoofLayerGeometry(roofMeshes, 1), [roofMeshes])
  const obstacleGeometry = useMemo(() => buildObstacleLayerGeometry(obstacleMeshes, 1), [obstacleMeshes])
  const shadeLayerVisible = orbitEnabled && shadingEnabled && shadingComputeState !== 'PENDING' && shadingComputeState !== 'IDLE'
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
    const shadeLayer = new ProjectedBinaryShadeLayer('roof-shaded-cells-layer')

    map.addLayer(roofLayer)
    map.addLayer(obstacleLayer)
    map.addLayer(shadeLayer)
    obstacleLayer.setZExaggeration(1)
    roofLayer.setZExaggeration(1)
    shadeLayer.setZExaggeration(1)

    roofLayerRef.current = roofLayer
    obstacleLayerRef.current = obstacleLayer
    shadeLayerRef.current = shadeLayer

    return () => {
      if (map.getLayer(shadeLayer.id)) {
        map.removeLayer(shadeLayer.id)
      }
      if (map.getLayer(obstacleLayer.id)) {
        map.removeLayer(obstacleLayer.id)
      }
      if (map.getLayer(roofLayer.id)) {
        map.removeLayer(roofLayer.id)
      }
      roofLayerRef.current = null
      obstacleLayerRef.current = null
      shadeLayerRef.current = null
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
    shadeLayerRef.current?.setRoofMeshes(roofMeshes)
    if (shadingMode === 'annual-sun-access') {
      shadeLayerRef.current?.setShadedCells(shadingCells)
    } else {
      shadeLayerRef.current?.setShadeResult(shadingResult)
    }
  }, [mapLoaded, roofMeshes, shadingCells, shadingMode, shadingResult])

  useEffect(() => {
    if (!mapLoaded) {
      return
    }
    shadeLayerRef.current?.setVisible(shadeLayerVisible)
  }, [mapLoaded, shadeLayerVisible])

  useEffect(() => {
    if (!mapLoaded) {
      return
    }
    roofLayerRef.current?.setVisible(meshLayersVisible)
    obstacleLayerRef.current?.setVisible(meshLayersVisible)
  }, [mapLoaded, meshLayersVisible])
}
