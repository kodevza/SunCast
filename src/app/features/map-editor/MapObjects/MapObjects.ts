import type { RefObject } from 'react'
import type maplibregl from 'maplibre-gl'
import type { ObstacleMeshData, RoofMeshData } from '../../../../types/geometry'
import type { BinaryShadedCell } from '../../../analysis/analysis.types'
import type { ComputeRoofShadeGridResult } from '../../../../geometry/shading'
import { useMapObjectsSync } from './hooks/useMapObjectsSync'

export interface MapObjectsModel {
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

export function useMapObjects(model: MapObjectsModel): void {
  useMapObjectsSync(model)
}
