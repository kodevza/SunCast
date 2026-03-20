import { useMemo } from 'react'
import type { GeometrySelectionState } from '../../editor-session/editorSession.types'
import type { useProjectStore } from '../../project-store/useProjectStore'

export interface ObstacleCommands {
  selectObstacle: (obstacleId: string, multiSelect: boolean) => void
  setActiveObstacleHeight: (heightM: number) => void
  setActiveObstacleKind: (kind: 'building' | 'tree' | 'pole' | 'custom') => void
  deleteActiveObstacle: () => void
}

interface UseObstacleCommandsArgs {
  project: ReturnType<typeof useProjectStore>
  geometrySelection: Pick<GeometrySelectionState, 'clearSelectionState'>
}

export function useObstacleCommands({ project, geometrySelection }: UseObstacleCommandsArgs): ObstacleCommands {
  return useMemo(
    () => ({
      selectObstacle: (obstacleId: string, multiSelect: boolean) => {
        if (multiSelect) {
          project.toggleObstacleSelection(obstacleId)
        } else {
          project.selectOnlyObstacle(obstacleId)
        }
        geometrySelection.clearSelectionState()
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
        geometrySelection.clearSelectionState()
      },
    }),
    [geometrySelection, project],
  )
}
