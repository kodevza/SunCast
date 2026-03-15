import type { RefObject } from 'react'
import type maplibregl from 'maplibre-gl'
import type { ObstacleMeshData, RoofMeshData } from '../../../../types/geometry'
import type { ShadeHeatmapFeature } from '../../../analysis/analysis.types'
import { useMapObjectsSync } from './hooks/useMapObjectsSync'

export interface MapObjectsModel {
  mapRef: RefObject<maplibregl.Map | null>
  mapLoaded: boolean
  roofMeshes: RoofMeshData[]
  obstacleMeshes: ObstacleMeshData[]
  heatmapFeatures: ShadeHeatmapFeature[]
  orbitEnabled: boolean
  meshesVisible: boolean
  shadingEnabled: boolean
  shadingComputeState: 'IDLE' | 'SCHEDULED' | 'READY'
}

export function useMapObjects(model: MapObjectsModel): void {
  useMapObjectsSync(model)
}
