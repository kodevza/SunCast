import { useMemo } from 'react'
import { useSunCastAppContext } from '../screens/SunCastAppProvider'

export interface SelectionCommands {
  selectFootprint: (footprintId: string, multiSelect: boolean) => void
  selectObstacle: (obstacleId: string, multiSelect: boolean) => void
  clearSelection: () => void
}

export function useSelectionCommands(): SelectionCommands {
  const { project, session } = useSunCastAppContext()

  return useMemo(
    () => ({
      selectFootprint: (footprintId: string, multiSelect: boolean) => {
        if (multiSelect) {
          project.toggleFootprintSelection(footprintId)
        } else {
          project.selectOnlyFootprint(footprintId)
        }
        session.clearSelectionState()
      },
      selectObstacle: (obstacleId: string, multiSelect: boolean) => {
        if (multiSelect) {
          project.toggleObstacleSelection(obstacleId)
        } else {
          project.selectOnlyObstacle(obstacleId)
        }
        session.clearSelectionState()
      },
      clearSelection: () => {
        session.clearSelectionState()
        project.clearFootprintSelection()
        project.clearObstacleSelection()
      },
    }),
    [project, session],
  )
}
