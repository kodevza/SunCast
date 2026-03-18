import { useMemo } from 'react'
import { clampPitchAdjustmentPercent } from '../features/sidebar/statusPanel.types'
import { prepareActiveFootprintGeometry } from './activeFootprintGeometry'
import type { FootprintPolygon } from '../../types/geometry'
import { useActiveFootprintState } from './useActiveFootprintState'

interface UseActiveFootprintMetricsArgs {
  activeFootprint: FootprintPolygon | null
  basePitchDeg: number | null
  activePitchAdjustmentPercent: number
}

export function useActiveFootprintMetrics({
  activeFootprint,
  basePitchDeg,
  activePitchAdjustmentPercent,
}: UseActiveFootprintMetricsArgs) {
  const activeFootprintGeometry = useMemo(
    () => prepareActiveFootprintGeometry(activeFootprint),
    [activeFootprint],
  )
  const clampedPitchAdjustmentPercent = activeFootprint
    ? clampPitchAdjustmentPercent(activePitchAdjustmentPercent)
    : 0

  return useActiveFootprintState({
    activeFootprintErrors: activeFootprintGeometry.activeFootprintErrors,
    activeFootprintCentroid: activeFootprintGeometry.activeFootprintCentroid,
    activePitchAdjustmentPercent: clampedPitchAdjustmentPercent,
    basePitchDeg,
  })
}
