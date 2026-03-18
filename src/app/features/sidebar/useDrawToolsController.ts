import { useMemo } from 'react'
import { useDrawingCommands } from '../../hooks/useDrawingCommands'
import { useSunCastAppContext } from '../../screens/SunCastAppProvider'
import type { DrawToolsProps } from '../map-editor/DrawTools/DrawTools.types'

export function useDrawToolsController(): DrawToolsProps {
  const { project, session } = useSunCastAppContext()
  const drawing = useDrawingCommands()

  return useMemo(
    () => ({
      editMode: session.editMode,
      isDrawingRoof: project.state.isDrawing,
      isDrawingObstacle: project.state.isDrawingObstacle,
      roofPointCount: project.state.drawDraft.length,
      obstaclePointCount: project.state.obstacleDrawDraft.length,
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
    [drawing, project.state.drawDraft.length, project.state.isDrawing, project.state.isDrawingObstacle, project.state.obstacleDrawDraft.length, session.editMode],
  )
}
