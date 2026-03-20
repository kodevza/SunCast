import { useMemo } from 'react'
import { useConstraintCommands } from './useConstraintCommands'
import type { GeometryEditingState, GeometrySelectionState } from '../../editor-session/editorSession.types'
import type { useProjectStore } from '../../project-store/useProjectStore'
import type { RoofEditorProps } from './RoofEditor'

interface UseRoofEditorControllerArgs {
  project: ReturnType<typeof useProjectStore>
  geometrySelection: Pick<GeometrySelectionState, 'safeSelectedVertexIndex' | 'safeSelectedEdgeIndex'>
  geometryEditing: Pick<GeometryEditingState, 'setConstraintLimitError'>
}

export function useRoofEditorController({
  project,
  geometrySelection,
  geometryEditing,
}: UseRoofEditorControllerArgs): RoofEditorProps {
  const constraints = useConstraintCommands({ project, geometryEditing })

  return useMemo(
    () => ({
      footprint: project.activeFootprint,
      vertexConstraints: project.activeConstraints.vertexHeights,
      selectedVertexIndex: geometrySelection.safeSelectedVertexIndex,
      selectedEdgeIndex: geometrySelection.safeSelectedEdgeIndex,
      onSetVertex: constraints.setVertex,
      onSetEdge: constraints.setEdge,
      onClearVertex: constraints.clearVertex,
      onClearEdge: constraints.clearEdge,
      onConstraintLimitExceeded: constraints.onConstraintLimitExceeded,
    }),
    [
      constraints.clearEdge,
      constraints.clearVertex,
      constraints.onConstraintLimitExceeded,
      constraints.setEdge,
      constraints.setVertex,
      geometrySelection.safeSelectedEdgeIndex,
      geometrySelection.safeSelectedVertexIndex,
      project.activeConstraints.vertexHeights,
      project.activeFootprint,
    ],
  )
}
