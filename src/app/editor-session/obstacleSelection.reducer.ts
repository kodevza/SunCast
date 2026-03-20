import type { EditorAction, EditorSessionState } from './editorSession.types'

export function obstacleSelectionReducer(state: EditorSessionState, action: EditorAction): EditorSessionState {
  switch (action.type) {
    case 'SET_ACTIVE_OBSTACLE':
      return {
        ...state,
        activeObstacleId: action.obstacleId,
      }
    case 'SELECT_ONLY_OBSTACLE':
      return {
        ...state,
        selectedObstacleIds: [action.obstacleId],
        activeObstacleId: action.obstacleId,
      }
    case 'TOGGLE_OBSTACLE_SELECTION':
      if (state.selectedObstacleIds.includes(action.obstacleId)) {
        const nextSelected = state.selectedObstacleIds.filter((id) => id !== action.obstacleId)
        return {
          ...state,
          selectedObstacleIds: nextSelected,
          activeObstacleId: state.activeObstacleId === action.obstacleId ? null : state.activeObstacleId,
        }
      }
      return {
        ...state,
        selectedObstacleIds: [...state.selectedObstacleIds, action.obstacleId],
        activeObstacleId: action.obstacleId,
      }
    case 'CLEAR_OBSTACLE_SELECTION':
      return {
        ...state,
        selectedObstacleIds: [],
      }
    default:
      return state
  }
}
