import { useMemo, useState } from 'react'
import { validateFootprint } from '../../geometry/solver/validation'
import type { FaceConstraints, FootprintPolygon, LngLat, VertexHeightConstraint } from '../../types/geometry'

interface UseConstraintEditorParams {
  activeFootprint: FootprintPolygon | null
  activeConstraints: FaceConstraints
  isDrawing: boolean
  selectedVertexIndex: number | null
  selectedEdgeIndex: number | null
  setVertexHeight: (vertexIndex: number, heightM: number) => boolean
  setVertexHeights: (constraints: VertexHeightConstraint[]) => boolean
  setEdgeHeight: (edgeIndex: number, heightM: number) => boolean
  moveVertex: (vertexIndex: number, point: LngLat) => void
  moveEdge: (edgeIndex: number, delta: LngLat) => void
}

export function useConstraintEditor({
  activeFootprint,
  activeConstraints,
  isDrawing,
  selectedVertexIndex,
  selectedEdgeIndex,
  setVertexHeight,
  setVertexHeights,
  setEdgeHeight,
  moveVertex,
  moveEdge,
}: UseConstraintEditorParams) {
  const [interactionError, setInteractionError] = useState<string | null>(null)

  const vertexCount = activeFootprint?.vertices.length ?? 0
  const safeSelectedVertexIndex =
    !activeFootprint ||
    isDrawing ||
    selectedVertexIndex === null ||
    selectedVertexIndex < 0 ||
    selectedVertexIndex >= vertexCount
      ? null
      : selectedVertexIndex
  const safeSelectedEdgeIndex =
    !activeFootprint || isDrawing || selectedEdgeIndex === null || selectedEdgeIndex < 0 || selectedEdgeIndex >= vertexCount
      ? null
      : selectedEdgeIndex

  const constraintMap = useMemo(
    () => new Map(activeConstraints.vertexHeights.map((constraint) => [constraint.vertexIndex, constraint.heightM])),
    [activeConstraints.vertexHeights],
  )

  const applyVertexHeight = (vertexIndex: number, heightM: number): boolean => {
    const applied = setVertexHeight(vertexIndex, heightM)
    if (!applied) {
      setInteractionError('Failed to apply vertex height')
      return false
    }
    setInteractionError(null)
    return true
  }

  const applyEdgeHeight = (edgeIndex: number, heightM: number): boolean => {
    if (!activeFootprint || edgeIndex < 0 || edgeIndex >= activeFootprint.vertices.length) {
      setInteractionError('Failed to apply edge height')
      return false
    }
    const applied = setEdgeHeight(edgeIndex, heightM)
    if (!applied) {
      setInteractionError('Failed to apply edge height')
      return false
    }

    setInteractionError(null)
    return true
  }

  const moveVertexIfValid = (vertexIndex: number, point: LngLat): boolean => {
    if (!activeFootprint) {
      return false
    }
    const nextVertices = [...activeFootprint.vertices]
    if (vertexIndex < 0 || vertexIndex >= nextVertices.length) {
      return false
    }
    nextVertices[vertexIndex] = point
    const errors = validateFootprint({ ...activeFootprint, vertices: nextVertices })
    if (errors.length > 0) {
      return false
    }
    moveVertex(vertexIndex, point)
    setInteractionError(null)
    return true
  }

  const moveEdgeIfValid = (edgeIndex: number, delta: LngLat): boolean => {
    if (!activeFootprint) {
      return false
    }
    const vertexTotal = activeFootprint.vertices.length
    if (edgeIndex < 0 || edgeIndex >= vertexTotal) {
      return false
    }
    const [deltaLon, deltaLat] = delta
    const start = edgeIndex
    const end = (edgeIndex + 1) % vertexTotal
    const nextVertices = [...activeFootprint.vertices]
    nextVertices[start] = [nextVertices[start][0] + deltaLon, nextVertices[start][1] + deltaLat]
    nextVertices[end] = [nextVertices[end][0] + deltaLon, nextVertices[end][1] + deltaLat]
    const errors = validateFootprint({ ...activeFootprint, vertices: nextVertices })
    if (errors.length > 0) {
      return false
    }
    moveEdge(edgeIndex, delta)
    setInteractionError(null)
    return true
  }

  const applyHeightStep = (stepM: number) => {
    if (!activeFootprint) {
      return
    }

    if (safeSelectedVertexIndex !== null) {
      const current = constraintMap.get(safeSelectedVertexIndex) ?? 0
      applyVertexHeight(safeSelectedVertexIndex, current + stepM)
      return
    }

    if (safeSelectedEdgeIndex !== null) {
      const vertexTotal = activeFootprint.vertices.length
      const start = safeSelectedEdgeIndex
      const end = (safeSelectedEdgeIndex + 1) % vertexTotal
      const nextStart = (constraintMap.get(start) ?? 0) + stepM
      const nextEnd = (constraintMap.get(end) ?? 0) + stepM
      const applied = setVertexHeights([
        { vertexIndex: start, heightM: nextStart },
        { vertexIndex: end, heightM: nextEnd },
      ])
      if (!applied) {
        setInteractionError('Failed to adjust edge heights')
        return
      }
      setInteractionError(null)
    }
  }

  return {
    interactionError,
    safeSelectedVertexIndex,
    safeSelectedEdgeIndex,
    applyVertexHeight,
    applyEdgeHeight,
    moveVertexIfValid,
    moveEdgeIfValid,
    applyHeightStep,
    clearInteractionError: () => setInteractionError(null),
    setConstraintLimitError: () => setInteractionError('Failed to apply height constraints'),
    setMoveRejectedError: () => setInteractionError('Roof polygon cannot self-intersect'),
  }
}
