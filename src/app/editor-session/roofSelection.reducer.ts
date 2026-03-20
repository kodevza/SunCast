import type { EditorAction, EditorSessionState } from './editorSession.types'

export function roofSelectionReducer(state: EditorSessionState, action: EditorAction): EditorSessionState {
  switch (action.type) {
    case 'SET_ACTIVE_FOOTPRINT':
      return {
        ...state,
        activeFootprintId: action.footprintId,
      }
    case 'SELECT_ONLY_FOOTPRINT':
      return {
        ...state,
        selectedFootprintIds: [action.footprintId],
        activeFootprintId: action.footprintId,
      }
    case 'TOGGLE_FOOTPRINT_SELECTION':
      if (state.selectedFootprintIds.includes(action.footprintId)) {
        const nextSelected = state.selectedFootprintIds.filter((id) => id !== action.footprintId)
        return {
          ...state,
          selectedFootprintIds: nextSelected,
          activeFootprintId: state.activeFootprintId === action.footprintId ? null : state.activeFootprintId,
        }
      }
      return {
        ...state,
        selectedFootprintIds: [...state.selectedFootprintIds, action.footprintId],
        activeFootprintId: action.footprintId,
      }
    case 'CLEAR_FOOTPRINT_SELECTION':
      return {
        ...state,
        selectedFootprintIds: [],
      }
    default:
      return state
  }
}
