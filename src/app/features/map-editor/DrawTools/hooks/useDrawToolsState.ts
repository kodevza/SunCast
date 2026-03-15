import { useMemo } from 'react'
import type { DrawToolsProps } from '../DrawTools.types'
import type { DrawWorkflowState } from '../model/drawTools.types'

export interface DrawToolsState {
  roof: DrawWorkflowState
  obstacle: DrawWorkflowState
}

export function useDrawToolsState(props: DrawToolsProps): DrawToolsState {
  const { isDrawingRoof, isDrawingObstacle, roofPointCount, obstaclePointCount } = props

  return useMemo(
    () => ({
      roof: {
        isDrawing: isDrawingRoof,
        pointCount: roofPointCount,
        canFinish: roofPointCount >= 3,
      },
      obstacle: {
        isDrawing: isDrawingObstacle,
        pointCount: obstaclePointCount,
        canFinish: obstaclePointCount >= 3,
      },
    }),
    [isDrawingObstacle, isDrawingRoof, obstaclePointCount, roofPointCount],
  )
}
