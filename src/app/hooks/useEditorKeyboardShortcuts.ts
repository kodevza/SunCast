import type { GeometrySelectionState } from '../editor-session/editorSession.types'
import type { ReturnTypeUseProjectDocument } from './hookReturnTypes'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

export function useEditorKeyboardShortcuts(
  projectDocument: ReturnTypeUseProjectDocument,
  geometrySelection: GeometrySelectionState,
): void {
  const store = projectDocument

  useKeyboardShortcuts({
    onSelectAllFootprints: () => {
      store.selectAllFootprints()
      geometrySelection.clearSelectionState()
    },
    isDrawing: store.state.isDrawing || store.state.isDrawingObstacle,
    onCancelDrawing: () => {
      if (store.state.isDrawingObstacle) {
        store.cancelObstacleDrawing()
      } else {
        store.cancelDrawing()
      }
      geometrySelection.clearSelectionState()
    },
  })
}
