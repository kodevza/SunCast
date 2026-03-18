import { useMemo } from 'react'
import { useSunCastAppContext } from '../screens/SunCastAppProvider'

export interface ObstacleCommands {
  selectObstacle: (obstacleId: string, multiSelect: boolean) => void
  setActiveObstacleHeight: (heightM: number) => void
  setActiveObstacleKind: (kind: 'building' | 'tree' | 'pole' | 'custom') => void
  deleteActiveObstacle: () => void
}

export function useObstacleCommands(): ObstacleCommands {
  const { project, session } = useSunCastAppContext()

  return useMemo(
    () => ({
      selectObstacle: (obstacleId: string, multiSelect: boolean) => {
        if (multiSelect) {
          project.toggleObstacleSelection(obstacleId)
        } else {
          project.selectOnlyObstacle(obstacleId)
        }
        session.clearSelectionState()
      },
      setActiveObstacleHeight: (heightM: number) => {
        if (!project.state.activeObstacleId) {
          return
        }
        project.setObstacleHeight(project.state.activeObstacleId, heightM)
      },
      setActiveObstacleKind: (kind: 'building' | 'tree' | 'pole' | 'custom') => {
        if (!project.state.activeObstacleId) {
          return
        }
        project.setObstacleKind(project.state.activeObstacleId, kind)
      },
      deleteActiveObstacle: () => {
        if (!project.state.activeObstacleId) {
          return
        }
        project.deleteObstacle(project.state.activeObstacleId)
        session.clearSelectionState()
      },
    }),
    [project, session],
  )
}
