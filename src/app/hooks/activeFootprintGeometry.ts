import { validateFootprint } from '../../geometry/solver/validation'
import type { FootprintPolygon } from '../../types/geometry'
import { computeFootprintCentroid } from '../../shared/utils/footprintGeometry'

export interface ActiveFootprintGeometryState {
  activeFootprintErrors: string[]
  activeFootprintCentroid: [number, number] | null
}

export function prepareActiveFootprintGeometry(activeFootprint: FootprintPolygon | null): ActiveFootprintGeometryState {
  return {
    activeFootprintErrors: validateFootprint(activeFootprint),
    activeFootprintCentroid: computeFootprintCentroid(activeFootprint?.vertices ?? []),
  }
}
