import { useEffect, useMemo } from 'react'
import type { AnnualSunAccessResult } from '../../../geometry/shading'
import type { AnnualSimulationOptions, AnnualSimulationState } from '../../analysis/analysis.types'
import type { ReturnTypeUseAnalysis } from '../../hooks/hookReturnTypes'
import type { useProjectStore } from '../../project-store/useProjectStore'
import { firstDayOfYearIso, lastDayOfYearIso } from '../../../shared/utils/dateIsoUtc'
import { annualSunAccessSimulationYear } from './annualSunAccessDate'

export interface AnnualSunAccessController {
  selectedRoofCount: number
  gridResolutionM: number
  dateStartIso: string | null
  dateEndIso: string | null
  state: AnnualSimulationState
  progressRatio: number
  result: AnnualSunAccessResult | null
  error: string | null
  isAnnualHeatmapVisible: boolean
  onGridResolutionChange: (gridResolutionM: number) => void
  onDateStartIsoChange: (dateStartIso: string | null) => void
  onDateEndIsoChange: (dateEndIso: string | null) => void
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
  const sunProjection = project.state.sunProjection
  const simulationYear = annualSunAccessSimulationYear()

  useEffect(() => {
    if (sunProjection.dateStartIso === null) {
      project.setSunProjectionDateStartIso(firstDayOfYearIso(simulationYear))
    }
    if (sunProjection.dateEndIso === null) {
      project.setSunProjectionDateEndIso(lastDayOfYearIso(simulationYear))
    }
  }, [project, simulationYear, sunProjection.dateEndIso, sunProjection.dateStartIso])

  return useMemo(
    () => ({
      selectedRoofCount: analysis.shadingRoofs.length,
      gridResolutionM: project.state.shadingSettings.gridResolutionM,
      dateStartIso: sunProjection.dateStartIso,
      dateEndIso: sunProjection.dateEndIso,
      state: analysis.annualSimulation.state,
      progressRatio: analysis.annualSimulation.progress.ratio,
      result: analysis.annualSimulation.result,
      error: analysis.annualSimulation.error,
      isAnnualHeatmapVisible: analysis.heatmap.annualVisible,
      onGridResolutionChange: (gridResolutionM: number) => {
        project.setShadingGridResolutionM(gridResolutionM)
      },
      onDateStartIsoChange: (dateStartIso: string | null) => {
        project.setSunProjectionDateStartIso(dateStartIso)
      },
      onDateEndIsoChange: (dateEndIso: string | null) => {
        project.setSunProjectionDateEndIso(dateEndIso)
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
    [analysis, project, sunProjection.dateEndIso, sunProjection.dateStartIso],
  )
}
