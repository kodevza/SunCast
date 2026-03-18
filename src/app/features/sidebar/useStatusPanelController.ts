import { useMemo } from 'react'
import { useActiveFootprintMetrics } from '../../hooks/useActiveFootprintMetrics'
import { useFootprintCommands } from '../../hooks/useFootprintCommands'
import { useSunCastAppContext } from '../../screens/SunCastAppProvider'
import type { StatusPanelProps } from './StatusPanel'

export function useStatusPanelController(): StatusPanelProps {
  const { project, analysis } = useSunCastAppContext()
  const footprint = useFootprintCommands()
  const activeFootprintMetrics = useActiveFootprintMetrics({
    activeFootprint: project.activeFootprint,
    basePitchDeg: analysis.solvedMetrics.basePitchDeg,
    activePitchAdjustmentPercent: project.activeFootprint
      ? project.state.footprints[project.activeFootprint.id]?.pitchAdjustmentPercent ?? 0
      : 0,
  })

  return useMemo(
    () => ({
      warnings: analysis.solvedRoofs.activeSolved?.solution.warnings ?? [],
      basePitchDeg: analysis.solvedMetrics.basePitchDeg,
      pitchAdjustmentPercent: activeFootprintMetrics.activePitchAdjustmentPercent,
      adjustedPitchDeg: activeFootprintMetrics.adjustedPitchDeg,
      onSetPitchAdjustmentPercent: footprint.setPitchAdjustmentPercent,
      azimuthDeg: analysis.solvedMetrics.azimuthDeg,
      roofAreaM2: analysis.solvedMetrics.roofAreaM2,
      minHeightM: analysis.solvedMetrics.minHeightM,
      maxHeightM: analysis.solvedMetrics.maxHeightM,
      fitRmsErrorM: analysis.solvedMetrics.fitRmsErrorM,
      activeFootprintLatDeg: activeFootprintMetrics.activeFootprintCentroid?.[1] ?? null,
      activeFootprintLonDeg: activeFootprintMetrics.activeFootprintCentroid?.[0] ?? null,
    }),
    [
      activeFootprintMetrics.activeFootprintCentroid,
      activeFootprintMetrics.activePitchAdjustmentPercent,
      activeFootprintMetrics.adjustedPitchDeg,
      analysis.solvedMetrics.azimuthDeg,
      analysis.solvedMetrics.basePitchDeg,
      analysis.solvedMetrics.fitRmsErrorM,
      analysis.solvedMetrics.maxHeightM,
      analysis.solvedMetrics.minHeightM,
      analysis.solvedMetrics.roofAreaM2,
      analysis.solvedRoofs.activeSolved,
      footprint.setPitchAdjustmentPercent,
    ],
  )
}
