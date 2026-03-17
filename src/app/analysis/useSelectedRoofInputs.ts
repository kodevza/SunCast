import { useMemo } from 'react'
import type { FootprintStateEntry } from '../../state/project-store/projectState.types'
import type { SelectedRoofSunInput } from '../../types/presentation-contracts'
import { computeFootprintCentroid } from '../../shared/utils/footprintGeometry'
import type { SolvedEntry } from './solvedRoof.types'

function clampPitchAdjustmentPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(200, Math.max(-90, value))
}

interface UseSelectedRoofInputsArgs {
  selectedFootprintIds: string[]
  footprintEntries: Record<string, FootprintStateEntry>
  solvedEntries: SolvedEntry[]
}

export function useSelectedRoofInputs({
  selectedFootprintIds,
  footprintEntries,
  solvedEntries,
}: UseSelectedRoofInputsArgs): SelectedRoofSunInput[] {
  const solvedByFootprintId = useMemo(
    () => new Map(solvedEntries.map((entry) => [entry.footprintId, entry])),
    [solvedEntries],
  )

  return useMemo(() => {
    const inputs: SelectedRoofSunInput[] = []
    for (const footprintId of selectedFootprintIds) {
      const solvedEntry = solvedByFootprintId.get(footprintId)
      const footprintEntry = footprintEntries[footprintId]
      if (!solvedEntry || !footprintEntry) {
        continue
      }
      const centroid = computeFootprintCentroid(footprintEntry.footprint.vertices)
      if (!centroid) {
        continue
      }
      inputs.push({
        footprintId,
        lonDeg: centroid[0],
        latDeg: centroid[1],
        kwp: footprintEntry.footprint.kwp,
        roofPitchDeg:
          solvedEntry.metrics.pitchDeg * (1 + clampPitchAdjustmentPercent(footprintEntry.pitchAdjustmentPercent) / 100),
        roofAzimuthDeg: solvedEntry.metrics.azimuthDeg,
        roofPlane: solvedEntry.solution.plane,
      })
    }
    return inputs
  }, [footprintEntries, selectedFootprintIds, solvedByFootprintId])
}
