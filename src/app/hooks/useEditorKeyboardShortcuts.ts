import type { ReturnTypeUseEditorSession, ReturnTypeUseProjectDocument } from './hookReturnTypes'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

export function useEditorKeyboardShortcuts(
  projectDocument: ReturnTypeUseProjectDocument,
  editorSession: ReturnTypeUseEditorSession,
): void {
  const { store } = projectDocument

  useKeyboardShortcuts({
    onSelectAllFootprints: () => {
      store.selectAllFootprints()
      editorSession.clearSelectionState()
    },
    isDrawing: store.state.isDrawing || store.state.isDrawingObstacle,
    onCancelDrawing: () => {
      if (store.state.isDrawingObstacle) {
        store.cancelObstacleDrawing()
      } else {
        store.cancelDrawing()
      }
      editorSession.clearSelectionState()
    },
  })
}
