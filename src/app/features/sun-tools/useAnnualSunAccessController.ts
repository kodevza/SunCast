import { useMemo } from 'react'
import type { AnnualSunAccessResult } from '../../../geometry/shading'
import type { AnnualSimulationOptions, AnnualSimulationState } from '../../analysis/analysis.types'
import type { ReturnTypeUseAnalysis } from '../../hooks/hookReturnTypes'
import type { useProjectStore } from '../../project-store/useProjectStore'

export interface AnnualSunAccessController {
  selectedRoofCount: number
  gridResolutionM: number
  state: AnnualSimulationState
  progressRatio: number
  result: AnnualSunAccessResult | null
  error: string | null
  isAnnualHeatmapVisible: boolean
  onGridResolutionChange: (gridResolutionM: number) => void
  onRunSimulation: (options: AnnualSimulationOptions) => Promise<void>
  onClearSimulation: () => void
  onShowAnnualHeatmap: () => void
  onHideAnnualHeatmap: () => void
}

interface UseAnnualSunAccessControllerArgs {
  project: ReturnType<typeof useProjectStore>
  analysis: ReturnTypeUseAnalysis
}

export function useAnnualSunAccessController({
  project,
  analysis,
}: UseAnnualSunAccessControllerArgs): AnnualSunAccessController {
  return useMemo(
    () => ({
      selectedRoofCount: analysis.shadingRoofs.length,
      gridResolutionM: project.state.shadingSettings.gridResolutionM,
      state: analysis.annualSimulation.state,
      progressRatio: analysis.annualSimulation.progress.ratio,
      result: analysis.annualSimulation.result,
      error: analysis.annualSimulation.error,
      isAnnualHeatmapVisible: analysis.heatmap.annualVisible,
      onGridResolutionChange: (gridResolutionM: number) => {
        project.setShadingGridResolutionM(gridResolutionM)
      },
      onRunSimulation: analysis.annualSimulation.runSimulation,
      onClearSimulation: () => {
        analysis.annualSimulation.clearSimulation()
        analysis.setRequestedHeatmapMode(project.state.shadingSettings.enabled ? 'live-shading' : 'none')
      },
      onShowAnnualHeatmap: () => {
        if (analysis.annualSimulation.state !== 'READY' || analysis.annualSimulation.heatmapFeatures.length === 0) {
          return
        }
        analysis.setRequestedHeatmapMode('annual-sun-access')
      },
      onHideAnnualHeatmap: () => {
        analysis.setRequestedHeatmapMode(project.state.shadingSettings.enabled ? 'live-shading' : 'none')
      },
    }),
    [analysis, project],
  )
}
