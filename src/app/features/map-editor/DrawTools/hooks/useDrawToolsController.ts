import { useMemo } from 'react'
import { useDrawingCommands } from './useDrawingCommands'
import type { EditModeState, GeometrySelectionState } from '../../../../editor-session/editorSession.types'
import type { useMapViewRuntime } from '../../MapView/useMapViewRuntime'
import type { useProjectStore } from '../../../../project-store/useProjectStore'
import type { DrawToolsProps } from '../DrawTools.types'

interface UseDrawToolsControllerArgs {
  project: ReturnType<typeof useProjectStore>
  mapView: ReturnType<typeof useMapViewRuntime>
  editMode: EditModeState
  geometrySelection: Pick<GeometrySelectionState, 'clearSelectionState'>
}

export function useDrawToolsController(args: UseDrawToolsControllerArgs): DrawToolsProps {
  const drawing = useDrawingCommands(args)

  return useMemo(
    () => ({
      editMode: args.editMode.editMode,
      isDrawingRoof: args.project.state.isDrawing,
      isDrawingObstacle: args.project.state.isDrawingObstacle,
      roofPointCount: args.project.state.drawDraft.length,
      obstaclePointCount: args.project.state.obstacleDrawDraft.length,
      onSetEditMode: drawing.setEditMode,
      onStartRoofDrawing: drawing.startRoof,
      onUndoRoofDrawing: drawing.undoRoof,
      onCancelRoofDrawing: drawing.cancelRoof,
      onCommitRoofDrawing: drawing.commitRoof,
      onStartObstacleDrawing: drawing.startObstacle,
      onUndoObstacleDrawing: drawing.undoObstacle,
      onCancelObstacleDrawing: drawing.cancelObstacle,
      onCommitObstacleDrawing: drawing.commitObstacle,
    }),
    [
      args.editMode.editMode,
      args.project.state.drawDraft.length,
      args.project.state.isDrawing,
      args.project.state.isDrawingObstacle,
      args.project.state.obstacleDrawDraft.length,
      drawing,
    ],
  )
}
