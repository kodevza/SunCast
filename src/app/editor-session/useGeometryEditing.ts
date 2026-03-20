import { useState } from 'react'
import { useConstraintEditor } from '../hooks/useConstraintEditor'
import type { GeometryEditingArgs, GeometryEditingState } from './editorSession.types'

export function useGeometryEditing(args: GeometryEditingArgs): GeometryEditingState {
  const [isGeometryDragActive, setIsGeometryDragActive] = useState(false)
  const {
    interactionError,
    moveVertexIfValid,
    moveEdgeIfValid,
    applyHeightStep,
    clearInteractionError,
    setConstraintLimitError,
    setMoveRejectedError,
  } = useConstraintEditor({
    activeFootprint: args.activeFootprint,
    activeConstraints: args.activeConstraints,
    isDrawing: args.isDrawing,
    selectedVertexIndex: args.selection.selectedVertexIndex,
    selectedEdgeIndex: args.selection.selectedEdgeIndex,
    setVertexHeight: args.setVertexHeight,
    setVertexHeights: args.setVertexHeights,
    setEdgeHeight: args.setEdgeHeight,
    moveFootprintVertex: args.moveFootprintVertex,
    moveFootprintEdge: args.moveFootprintEdge,
  })

  return {
    interactionError,
    isGeometryDragActive,
    setIsGeometryDragActive,
    moveVertexIfValid,
    moveEdgeIfValid,
    applyHeightStep,
    setConstraintLimitError,
    setMoveRejectedError,
    clearInteractionError,
  }
}
