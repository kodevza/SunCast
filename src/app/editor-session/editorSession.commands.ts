import type { Dispatch } from 'react'
import type { EditorAction } from './editorSession.types'

export interface EditorSessionCommands {
  startDrawing: () => void
  cancelDrawing: () => void
  addDraftPoint: (point: [number, number]) => void
  undoDraftPoint: () => void
  setActiveFootprint: (footprintId: string) => void
  selectOnlyFootprint: (footprintId: string) => void
  selectAllFootprints: () => void
  clearFootprintSelection: () => void
  startObstacleDrawing: () => void
  cancelObstacleDrawing: () => void
  addObstacleDraftPoint: (point: [number, number]) => void
  undoObstacleDraftPoint: () => void
  setActiveObstacle: (obstacleId: string) => void
  selectOnlyObstacle: (obstacleId: string) => void
  toggleObstacleSelection: (obstacleId: string) => void
  clearObstacleSelection: () => void
}

export function createEditorSessionCommands(
  dispatch: Dispatch<EditorAction>,
): EditorSessionCommands {
  return {
    startDrawing: () => dispatch({ type: 'START_DRAW' }),
    cancelDrawing: () => dispatch({ type: 'CANCEL_DRAW' }),
    addDraftPoint: (point: [number, number]) => dispatch({ type: 'ADD_DRAFT_POINT', point }),
    undoDraftPoint: () => dispatch({ type: 'UNDO_DRAFT_POINT' }),
    setActiveFootprint: (footprintId: string) => {
      dispatch({ type: 'SET_ACTIVE_FOOTPRINT', footprintId })
    },
    selectOnlyFootprint: (footprintId: string) => {
      dispatch({ type: 'SELECT_ONLY_FOOTPRINT', footprintId })
    },
    selectAllFootprints: () => dispatch({ type: 'SELECT_ALL_FOOTPRINTS' }),
    clearFootprintSelection: () => dispatch({ type: 'CLEAR_FOOTPRINT_SELECTION' }),
    startObstacleDrawing: () => dispatch({ type: 'START_OBSTACLE_DRAW' }),
    cancelObstacleDrawing: () => dispatch({ type: 'CANCEL_OBSTACLE_DRAW' }),
    addObstacleDraftPoint: (point: [number, number]) => dispatch({ type: 'ADD_OBSTACLE_DRAFT_POINT', point }),
    undoObstacleDraftPoint: () => dispatch({ type: 'UNDO_OBSTACLE_DRAFT_POINT' }),
    setActiveObstacle: (obstacleId: string) => dispatch({ type: 'SET_ACTIVE_OBSTACLE', obstacleId }),
    selectOnlyObstacle: (obstacleId: string) => dispatch({ type: 'SELECT_ONLY_OBSTACLE', obstacleId }),
    toggleObstacleSelection: (obstacleId: string) => dispatch({ type: 'TOGGLE_OBSTACLE_SELECTION', obstacleId }),
    clearObstacleSelection: () => dispatch({ type: 'CLEAR_OBSTACLE_SELECTION' }),
  }
}
