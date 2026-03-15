import type { DrawEditMode } from './model/drawTools.types'

export type { DrawEditMode } from './model/drawTools.types'

export interface DrawToolsProps {
  editMode: DrawEditMode
  isDrawingRoof: boolean
  isDrawingObstacle: boolean
  roofPointCount: number
  obstaclePointCount: number
  onSetEditMode: (mode: DrawEditMode) => void
  onStartRoofDrawing: () => void
  onUndoRoofDrawing: () => void
  onCancelRoofDrawing: () => void
  onCommitRoofDrawing: () => void
  onStartObstacleDrawing: () => void
  onUndoObstacleDrawing: () => void
  onCancelObstacleDrawing: () => void
  onCommitObstacleDrawing: () => void
}
