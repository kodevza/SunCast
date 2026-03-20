import { useCallback, useMemo } from 'react'
import { useSelectionState } from '../hooks/useSelectionState'
import type { GeometrySelectionState, GeometrySelectionStateArgs } from './editorSession.types'

export function useGeometrySelectionState({
  activeFootprint,
  isDrawing,
  onSelectionChange,
}: GeometrySelectionStateArgs): GeometrySelectionState {
  const {
    selectedVertexIndex,
    selectedEdgeIndex,
    clearSelectionState: clearSelectionIndices,
    selectVertex: selectVertexIndex,
    selectEdge: selectEdgeIndex,
  } = useSelectionState()

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

  const clearSelectionState = useCallback(() => {
    clearSelectionIndices()
    onSelectionChange?.()
  }, [clearSelectionIndices, onSelectionChange])

  const selectVertex = useCallback(
    (vertexIndex: number) => {
      selectVertexIndex(vertexIndex)
      onSelectionChange?.()
    },
    [onSelectionChange, selectVertexIndex],
  )

  const selectEdge = useCallback(
    (edgeIndex: number) => {
      selectEdgeIndex(edgeIndex)
      onSelectionChange?.()
    },
    [onSelectionChange, selectEdgeIndex],
  )

  return useMemo(
    () => ({
      selectedVertexIndex,
      selectedEdgeIndex,
      safeSelectedVertexIndex,
      safeSelectedEdgeIndex,
      clearSelectionState,
      selectVertex,
      selectEdge,
    }),
    [
      clearSelectionState,
      safeSelectedEdgeIndex,
      safeSelectedVertexIndex,
      selectEdge,
      selectVertex,
      selectedEdgeIndex,
      selectedVertexIndex,
    ],
  )
}
