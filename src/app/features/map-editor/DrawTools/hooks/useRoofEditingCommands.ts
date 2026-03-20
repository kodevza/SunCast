import { useMemo } from 'react'
import { validateFootprint } from '../../../../../geometry/solver/validation'
import type { useProjectStore } from '../../../../project-store/useProjectStore'
import type { GeometryEditingState } from '../../../../editor-session/editorSession.types'

interface Args {
  project: ReturnType<typeof useProjectStore>
  geometryEditing: Pick<GeometryEditingState, 'setMoveRejectedError'>
}

export function useRoofEditingCommands({ project, geometryEditing }: Args) {
  return useMemo(
    () => ({
      moveActiveVertexIfValid: (vertexIndex: number, point: [number, number]) => {
        const footprintId = project.state.activeFootprintId
        const activeFootprint = project.activeFootprint

        if (!footprintId || !activeFootprint) {
          return false
        }

        const nextVertices = [...activeFootprint.vertices]
        if (vertexIndex < 0 || vertexIndex >= nextVertices.length) {
          return false
        }

        nextVertices[vertexIndex] = point
        const errors = validateFootprint({
          ...activeFootprint,
          vertices: nextVertices,
        })

        if (errors.length > 0) {
          geometryEditing.setMoveRejectedError()
          return false
        }

        return project.moveFootprintVertex(footprintId, vertexIndex, point)
      },
    }),
    [geometryEditing, project],
  )
}
