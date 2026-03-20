import { useMemo } from 'react'
import type { EditModeState, GeometrySelectionState } from '../../../../editor-session/editorSession.types'
import type { useMapViewRuntime } from '../../MapView/useMapViewRuntime'
import type { useProjectStore } from '../../../../project-store/useProjectStore'

export interface DrawingCommands {
  setEditMode: (mode: 'roof' | 'obstacle') => void
  startRoof: () => void
  undoRoof: () => void
  cancelRoof: () => void
  commitRoof: () => void
  startObstacle: () => void
  undoObstacle: () => void
  cancelObstacle: () => void
  commitObstacle: () => void
}

interface UseDrawingCommandsArgs {
  project: ReturnType<typeof useProjectStore>
  mapView: ReturnType<typeof useMapViewRuntime>
  editMode: EditModeState
  geometrySelection: Pick<GeometrySelectionState, 'clearSelectionState'>
}

export function useDrawingCommands({
  project,
  mapView,
  editMode,
  geometrySelection,
}: UseDrawingCommandsArgs): DrawingCommands {
  return useMemo(
    () => ({
      setEditMode: (mode) => {
        editMode.setEditMode(mode)
        if (mode === 'roof' && project.state.isDrawingObstacle) {
          project.cancelObstacleDrawing()
        }
        if (mode === 'obstacle' && project.state.isDrawing) {
          project.cancelDrawing()
        }
      },
      startRoof: () => {
        mapView.setOrbitEnabled(false)
        project.cancelObstacleDrawing()
        geometrySelection.clearSelectionState()
        project.startDrawing()
      },
      undoRoof: project.undoDraftPoint,
      cancelRoof: () => {
        project.cancelDrawing()
        geometrySelection.clearSelectionState()
      },
      commitRoof: () => {
        project.commitFootprint()
        geometrySelection.clearSelectionState()
      },
      startObstacle: () => {
        mapView.setOrbitEnabled(false)
        project.cancelDrawing()
        geometrySelection.clearSelectionState()
        project.startObstacleDrawing()
      },
      undoObstacle: project.undoObstacleDraftPoint,
      cancelObstacle: () => {
        project.cancelObstacleDrawing()
        geometrySelection.clearSelectionState()
      },
      commitObstacle: () => {
        project.commitObstacle()
        geometrySelection.clearSelectionState()
      },
    }),
    [editMode, geometrySelection, mapView, project],
  )
}
