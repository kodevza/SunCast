import { useMemo } from 'react'
import type { ShadingRoofInput } from '../../geometry/shading'
import { toShadingObstacleVolume } from '../../geometry/obstacles/obstacleModels'
import type { FootprintStateEntry } from '../../state/project-store/projectState.types'
import type { ObstacleStateEntry } from '../../types/geometry'
import { buildObstacleGeometryCacheKey, buildRoofGeometryCacheKey } from '../../shared/utils/shadingCacheKey'
import type { SolvedEntry } from './solvedRoof.types'

interface DeriveShadingRoofsArgs {
  selectedFootprintIds: string[]
  activeFootprintId: string | null
  footprintEntries: Record<string, FootprintStateEntry>
  solvedEntries: SolvedEntry[]
  obstacles: ObstacleStateEntry[]
  datetimeIso: string | null
}

export function useDerivedShadingRoofs({
  selectedFootprintIds,
  activeFootprintId,
  footprintEntries,
  solvedEntries,
  obstacles,
  datetimeIso,
}: DeriveShadingRoofsArgs): ShadingRoofInput[] {
  return useMemo(() => {
    const solvedByFootprintId = new Map(solvedEntries.map((entry) => [entry.footprintId, entry]))
    const roofIdsForShading =
      selectedFootprintIds.length > 0 ? selectedFootprintIds : activeFootprintId ? [activeFootprintId] : []

    const baseRoofs = roofIdsForShading
      .map((footprintId) => {
        const footprintEntry = footprintEntries[footprintId]
        const solvedEntry = solvedByFootprintId.get(footprintId)
        if (!footprintEntry || !solvedEntry) {
          return null
        }

        const polygon = footprintEntry.footprint.vertices
        const vertexHeightsM = solvedEntry.solution.vertexHeightsM
        if (polygon.length < 3 || polygon.length !== vertexHeightsM.length) {
          return null
        }

        return {
          roofId: footprintId,
          polygon,
          vertexHeightsM,
        }
      })
      .filter((entry): entry is ShadingRoofInput => Boolean(entry))

    const roofGeometryKey = buildRoofGeometryCacheKey(baseRoofs)
    const obstacleGeometryKey = buildObstacleGeometryCacheKey(obstacles.map(toShadingObstacleVolume))
    const contextKey = [roofGeometryKey, obstacleGeometryKey, datetimeIso ?? ''].join('::')

    return baseRoofs.map((roof) => ({
      ...roof,
      roofId: `${roof.roofId}::${contextKey}`,
    }))
  }, [activeFootprintId, datetimeIso, footprintEntries, obstacles, selectedFootprintIds, solvedEntries])
}
