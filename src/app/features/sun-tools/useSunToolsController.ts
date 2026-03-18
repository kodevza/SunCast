import { useMemo } from 'react'
import { useSunCastAppContext } from '../../screens/SunCastAppProvider'
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

export function useSunToolsController(): SunToolsController {
  const { project, session, analysis } = useSunCastAppContext()
  const annualSunAccess = useAnnualSunAccessController()
  const selectedRoofInputs = useSelectedRoofInputs()

  return useMemo(
    () => ({
      sunProjectionEnabled: project.state.sunProjection.enabled,
      hasValidSunDatetime: analysis.sunProjection.hasValidDatetime,
      onToggleSunProjectionEnabled: (enabled: boolean) => {
        project.setSunProjectionEnabled(enabled)
      },
      onSunDatetimeInputChange: (datetimeIsoRaw: string) => {
        session.setTutorialDatetimeEdited(true)
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
    [analysis, annualSunAccess, project, selectedRoofInputs, session],
  )
}
