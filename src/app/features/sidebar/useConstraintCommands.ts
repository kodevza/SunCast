import { useMemo } from 'react'
import type { GeometryEditingState } from '../../editor-session/editorSession.types'
import type { useProjectStore } from '../../project-store/useProjectStore'

export interface ConstraintCommands {
  setVertex: (vertexIndex: number, heightM: number) => boolean
  setEdge: (edgeIndex: number, heightM: number) => boolean
  clearVertex: (vertexIndex: number) => void
  clearEdge: (edgeIndex: number) => void
  onConstraintLimitExceeded: () => void
}

interface UseConstraintCommandsArgs {
  project: ReturnType<typeof useProjectStore>
  geometryEditing: Pick<GeometryEditingState, 'setConstraintLimitError'>
}

export function useConstraintCommands({ project, geometryEditing }: UseConstraintCommandsArgs): ConstraintCommands {
  return useMemo(
    () => ({
      setVertex: (vertexIndex: number, heightM: number) => {
        if (!project.activeFootprint) {
          return false
        }
        return project.setFootprintVertexHeight(project.activeFootprint.id, vertexIndex, heightM)
      },
      setEdge: (edgeIndex: number, heightM: number) => {
        if (!project.activeFootprint) {
          return false
        }
        return project.setFootprintEdgeHeight(project.activeFootprint.id, edgeIndex, heightM)
      },
      clearVertex: (vertexIndex: number) => {
        if (!project.activeFootprint) {
          return
        }
        project.clearFootprintVertexHeight(project.activeFootprint.id, vertexIndex)
      },
      clearEdge: (edgeIndex: number) => {
        if (!project.activeFootprint) {
          return
        }
        project.clearFootprintEdgeHeight(project.activeFootprint.id, edgeIndex)
      },
      onConstraintLimitExceeded: geometryEditing.setConstraintLimitError,
    }),
    [geometryEditing.setConstraintLimitError, project],
  )
}
