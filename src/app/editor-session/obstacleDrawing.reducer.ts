import type { EditorAction, EditorSessionState } from './editorSession.types'

export function obstacleDrawingReducer(state: EditorSessionState, action: EditorAction): EditorSessionState {
  switch (action.type) {
    case 'START_OBSTACLE_DRAW':
      return { ...state, isDrawingObstacle: true, obstacleDrawDraft: [] }
    case 'CANCEL_OBSTACLE_DRAW':
      return { ...state, isDrawingObstacle: false, obstacleDrawDraft: [] }
    case 'ADD_OBSTACLE_DRAFT_POINT':
      return {
        ...state,
        obstacleDrawDraft: [...state.obstacleDrawDraft, action.point],
      }
    case 'UNDO_OBSTACLE_DRAFT_POINT':
      return {
        ...state,
        obstacleDrawDraft: state.obstacleDrawDraft.slice(0, -1),
      }
    default:
      return state
  }
}
