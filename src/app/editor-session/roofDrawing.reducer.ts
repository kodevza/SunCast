import type { EditorAction, EditorSessionState } from './editorSession.types'

export function roofDrawingReducer(state: EditorSessionState, action: EditorAction): EditorSessionState {
  switch (action.type) {
    case 'START_DRAW':
      return { ...state, isDrawing: true, drawDraft: [] }
    case 'CANCEL_DRAW':
      return { ...state, isDrawing: false, drawDraft: [] }
    case 'ADD_DRAFT_POINT':
      return {
        ...state,
        drawDraft: [...state.drawDraft, action.point],
      }
    case 'UNDO_DRAFT_POINT':
      return {
        ...state,
        drawDraft: state.drawDraft.slice(0, -1),
      }
    case 'ADD_FOOTPRINT': {
      return {
        ...state,
        isDrawing: false,
        drawDraft: [],
      }
    }
    default:
      return state
  }
}
