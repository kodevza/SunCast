import { useMemo } from 'react'
import type { ReturnTypeUseAnalysis } from '../../hooks/hookReturnTypes'
import type { TutorialState } from '../../editor-session/editorSession.types'
import type { useProjectStore } from '../../project-store/useProjectStore'
import { useAnnualSunAccessController } from './useAnnualSunAccessController'
import { useSelectedRoofInputs } from './useSelectedRoofInputs'

interface SunToolsController {
  sunProjectionEnabled: boolean
  hasValidSunDatetime: boolean
  onToggleSunProjectionEnabled: (enabled: boolean) => void
  onSunDatetimeInputChange: (datetimeIsoRaw: string) => void
  sunDatetimeRaw: string
  sunDailyDateRaw: string
  sunDailyTimeZone: string
  selectedRoofInputs: ReturnType<typeof useSelectedRoofInputs>
  hasSolvedActiveRoof: boolean
  productionComputationEnabled: boolean
  annualSunAccess: ReturnType<typeof useAnnualSunAccessController>
}

interface UseSunToolsControllerArgs {
  project: ReturnType<typeof useProjectStore>
  analysis: ReturnTypeUseAnalysis
  tutorial: Pick<TutorialState, 'setTutorialDatetimeEdited'>
}

export function useSunToolsController({
  project,
  analysis,
  tutorial,
}: UseSunToolsControllerArgs): SunToolsController {
  const annualSunAccess = useAnnualSunAccessController({ project, analysis })
  const selectedRoofInputs = useSelectedRoofInputs({ project, analysis })

  return useMemo(
    () => ({
      sunProjectionEnabled: project.state.sunProjection.enabled,
      hasValidSunDatetime: analysis.sunProjection.hasValidDatetime,
      onToggleSunProjectionEnabled: (enabled: boolean) => {
        project.setSunProjectionEnabled(enabled)
      },
      onSunDatetimeInputChange: (datetimeIsoRaw: string) => {
        tutorial.setTutorialDatetimeEdited(true)
        analysis.sunProjection.onDatetimeInputChange(datetimeIsoRaw)
      },
      sunDatetimeRaw: analysis.sunProjection.datetimeRaw,
      sunDailyDateRaw: analysis.sunProjection.dailyDateRaw,
      sunDailyTimeZone: analysis.sunProjection.dailyTimeZone,
      selectedRoofInputs,
      hasSolvedActiveRoof: Boolean(analysis.solvedRoofs.activeSolved),
      productionComputationEnabled: analysis.productionComputationEnabled,
      annualSunAccess,
    }),
    [analysis, annualSunAccess, project, selectedRoofInputs, tutorial],
  )
}
