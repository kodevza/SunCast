import { useMemo } from 'react'
import { useSunCastAppContext } from '../screens/SunCastAppProvider'
import { clampPitchAdjustmentPercent } from '../features/sidebar/statusPanel.types'

export interface FootprintCommands {
  setActiveFootprintKwp: (kwp: number) => void
  deleteActiveFootprint: () => void
  setPitchAdjustmentPercent: (pitchAdjustmentPercent: number) => void
}

export function useFootprintCommands(): FootprintCommands {
  const { project, session } = useSunCastAppContext()

  return useMemo(
    () => ({
      setActiveFootprintKwp: (kwp: number) => {
        project.setActiveFootprintKwp(kwp)
        const footprintId = project.state.activeFootprintId
        if (footprintId) {
          session.setTutorialEditedKwpByFootprint((current) => ({ ...current, [footprintId]: true }))
        }
      },
      deleteActiveFootprint: () => {
        if (!project.state.activeFootprintId) {
          return
        }
        project.deleteFootprint(project.state.activeFootprintId)
        session.clearSelectionState()
      },
      setPitchAdjustmentPercent: (pitchAdjustmentPercent: number) => {
        project.setActivePitchAdjustmentPercent(clampPitchAdjustmentPercent(pitchAdjustmentPercent))
      },
    }),
    [project, session],
  )
}
