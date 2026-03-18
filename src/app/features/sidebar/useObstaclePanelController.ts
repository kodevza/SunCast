import { useMemo } from 'react'
import { useObstacleCommands } from '../../hooks/useObstacleCommands'
import { useSelectionCommands } from '../../hooks/useSelectionCommands'
import { useSunCastAppContext } from '../../screens/SunCastAppProvider'
import type { ObstaclePanelProps } from './ObstaclePanel'

export function useObstaclePanelController(): ObstaclePanelProps {
  const { project } = useSunCastAppContext()
  const selection = useSelectionCommands()
  const obstacle = useObstacleCommands()

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
