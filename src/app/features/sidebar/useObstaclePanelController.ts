import { useMemo } from 'react'
import { useObstacleCommands } from './useObstacleCommands'
import { useSelectionCommands } from './useSelectionCommands'
import type { GeometrySelectionState } from '../../editor-session/editorSession.types'
import type { useProjectStore } from '../../project-store/useProjectStore'
import type { ObstaclePanelProps } from './ObstaclePanel'

interface UseObstaclePanelControllerArgs {
  project: ReturnType<typeof useProjectStore>
  geometrySelection: Pick<GeometrySelectionState, 'clearSelectionState'>
}

export function useObstaclePanelController({
  project,
  geometrySelection,
}: UseObstaclePanelControllerArgs): ObstaclePanelProps {
  const selection = useSelectionCommands({ project, geometrySelection })
  const obstacle = useObstacleCommands({ project, geometrySelection })

  return useMemo(
    () => ({
      obstacles: project.obstacles,
      activeObstacle: project.activeObstacle,
      selectedObstacleIds: project.state.selectedObstacleIds,
      onSelectObstacle: selection.selectObstacle,
      onSetActiveObstacleKind: obstacle.setActiveObstacleKind,
      onSetActiveObstacleHeight: obstacle.setActiveObstacleHeight,
      onDeleteActiveObstacle: obstacle.deleteActiveObstacle,
    }),
    [
      obstacle.deleteActiveObstacle,
      obstacle.setActiveObstacleHeight,
      obstacle.setActiveObstacleKind,
      project.activeObstacle,
      project.obstacles,
      project.state.selectedObstacleIds,
      selection.selectObstacle,
    ],
  )
}
