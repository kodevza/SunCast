import { useMemo } from 'react'
import { useActiveFootprintMetrics } from './useActiveFootprintMetrics'
import { useFootprintCommands } from './useFootprintCommands'
import type { ReturnTypeUseAnalysis } from '../../hooks/hookReturnTypes'
import type { GeometrySelectionState, TutorialState } from '../../editor-session/editorSession.types'
import type { useProjectStore } from '../../project-store/useProjectStore'
import type { StatusPanelProps } from './StatusPanel'

interface UseStatusPanelControllerArgs {
  project: ReturnType<typeof useProjectStore>
  analysis: ReturnTypeUseAnalysis
  tutorial: Pick<TutorialState, 'setTutorialEditedKwpByFootprint'>
  geometrySelection: Pick<GeometrySelectionState, 'clearSelectionState'>
}

export function useStatusPanelController({
  project,
  analysis,
  tutorial,
  geometrySelection,
}: UseStatusPanelControllerArgs): StatusPanelProps {
  const footprint = useFootprintCommands({ project, tutorial, geometrySelection })
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
