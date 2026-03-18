import { useMemo } from 'react'
import { useSunCastAppContext } from '../screens/SunCastAppProvider'

export interface ConstraintCommands {
  setVertex: (vertexIndex: number, heightM: number) => boolean
  setEdge: (edgeIndex: number, heightM: number) => boolean
  clearVertex: (vertexIndex: number) => void
  clearEdge: (edgeIndex: number) => void
  onConstraintLimitExceeded: () => void
}

export function useConstraintCommands(): ConstraintCommands {
  const { project, session } = useSunCastAppContext()

  return useMemo(
    () => ({
      setVertex: project.setVertexHeight,
      setEdge: project.setEdgeHeight,
      clearVertex: project.clearVertexHeight,
      clearEdge: project.clearEdgeHeight,
      onConstraintLimitExceeded: session.setConstraintLimitError,
    }),
    [project, session],
  )
}
