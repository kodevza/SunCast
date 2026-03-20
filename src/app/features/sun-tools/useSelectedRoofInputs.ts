import { useMemo } from 'react'
import { computeFootprintCentroid } from '../../../shared/utils/footprintGeometry'
import type { SelectedRoofSunInput } from '../../../types/presentation-contracts'
import type { ReturnTypeUseAnalysis } from '../../hooks/hookReturnTypes'
import type { useProjectStore } from '../../project-store/useProjectStore'

function clampPitchAdjustmentPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(200, Math.max(-90, value))
}

interface UseSelectedRoofInputsArgs {
  project: ReturnType<typeof useProjectStore>
  analysis: ReturnTypeUseAnalysis
}

export function useSelectedRoofInputs({ project, analysis }: UseSelectedRoofInputsArgs): SelectedRoofSunInput[] {
  const solvedByFootprintId = useMemo(
    () => new Map(analysis.solvedRoofs.entries.map((entry) => [entry.footprintId, entry])),
    [analysis.solvedRoofs.entries],
  )

  return useMemo(() => {
    const inputs: SelectedRoofSunInput[] = []

    for (const footprintId of project.selectedFootprintIds) {
      const solvedEntry = solvedByFootprintId.get(footprintId)
      const footprintEntry = project.state.footprints[footprintId]
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
  }, [project.selectedFootprintIds, project.state.footprints, solvedByFootprintId])
}
