import type { LngLat, ObstacleKind } from '../../types/geometry'

export interface RoofGeometryCacheInput {
  roofId: string
  polygon: LngLat[]
  vertexHeightsM: number[]
}

export type ObstacleGeometryCacheInput =
  | {
      id: string
      kind: ObstacleKind
      shape: 'prism'
      polygon: LngLat[]
      heightAboveGroundM: number
    }
  | {
      id: string
      kind: ObstacleKind
      shape: 'cylinder'
      center: LngLat
      radiusM: number
      heightAboveGroundM: number
    }

// Purpose: Builds deterministic cache key for roof geometry inputs.
// Why: Keeps cache key serialization reusable across shading workflows.
export function buildRoofGeometryCacheKey(roofs: RoofGeometryCacheInput[]): string {
  return roofs
    .map((roof) => {
      const polygonKey = roof.polygon.map(([lon, lat]) => `${lon.toFixed(7)},${lat.toFixed(7)}`).join(';')
      const heightsKey = roof.vertexHeightsM.map((heightM) => heightM.toFixed(4)).join(',')
      return `${roof.roofId}|${polygonKey}|${heightsKey}`
    })
    .join('||')
}

// Purpose: Builds deterministic cache key for obstacle geometry inputs.
// Why: Keeps cache key serialization reusable across shading workflows.
export function buildObstacleGeometryCacheKey(obstacles: ObstacleGeometryCacheInput[]): string {
  return obstacles
    .map((obstacle) => {
      const baseKey = `${obstacle.id}|${obstacle.kind}|${obstacle.heightAboveGroundM.toFixed(4)}`
      if (obstacle.shape === 'prism') {
        const polygonKey = obstacle.polygon.map(([lon, lat]) => `${lon.toFixed(7)},${lat.toFixed(7)}`).join(';')
        return `${baseKey}|prism|${polygonKey}`
      }
      return `${baseKey}|cylinder|${obstacle.center[0].toFixed(7)},${obstacle.center[1].toFixed(7)}|${obstacle.radiusM.toFixed(4)}`
    })
    .join('||')
}
