import { initialEditorSessionState } from './editorSession.types'
import type { EditorAction, EditorSessionState } from './editorSession.types'
import { roofSelectionReducer } from './roofSelection.reducer'
import { obstacleDrawingReducer } from './obstacleDrawing.reducer'
import { roofDrawingReducer } from './roofDrawing.reducer'
import { obstacleSelectionReducer } from './obstacleSelection.reducer'

export function editorSessionReducer(state: EditorSessionState, action: EditorAction): EditorSessionState {
  const roofDrawingState = roofDrawingReducer(state, action)
  if (roofDrawingState !== state) {
    return roofDrawingState
  }

  const obstacleDrawingState = obstacleDrawingReducer(state, action)
  if (obstacleDrawingState !== state) {
    return obstacleDrawingState
  }

  const obstacleSelectionState = obstacleSelectionReducer(state, action)
  if (obstacleSelectionState !== state) {
    return obstacleSelectionState
  }

  const roofSelectionState = roofSelectionReducer(state, action)
  if (roofSelectionState !== state) {
    return roofSelectionState
  }

  switch (action.type) {
    case 'RESET_STATE':
      return {
        ...state,
        ...initialEditorSessionState,
      }
    default:
      return state
  }
}
