import { useMemo } from 'react'
import { useConstraintCommands } from '../../hooks/useConstraintCommands'
import { useSunCastAppContext } from '../../screens/SunCastAppProvider'
import type { RoofEditorProps } from './RoofEditor'

export function useRoofEditorController(): RoofEditorProps {
  const { project, session } = useSunCastAppContext()
  const constraints = useConstraintCommands()

  return useMemo(
    () => ({
      footprint: project.activeFootprint,
      vertexConstraints: project.activeConstraints.vertexHeights,
      selectedVertexIndex: session.safeSelectedVertexIndex,
      selectedEdgeIndex: session.safeSelectedEdgeIndex,
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
      project.activeConstraints.vertexHeights,
      project.activeFootprint,
      session.safeSelectedEdgeIndex,
      session.safeSelectedVertexIndex,
    ],
  )
}
