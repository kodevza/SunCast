import type maplibregl from 'maplibre-gl'
import {
  CLICK_HIT_TOLERANCE_PX,
  DRAG_HIT_TOLERANCE_PX,
  EDGE_HIT_LAYER_ID,
  FOOTPRINT_HIT_LAYER_ID,
  OBSTACLE_EDGE_HIT_LAYER_ID,
  OBSTACLE_HIT_LAYER_ID,
  OBSTACLE_VERTEX_HIT_LAYER_ID,
  VERTEX_HIT_LAYER_ID,
  zoomAdaptiveHitTolerancePx,
} from './mapViewConstants'
import { getEdgeHit, getFootprintHit, getHitFeatures, getObstacleHit, getVertexHit } from './mapViewHitTesting'
import type { DragState, MapInteractionModel } from './mapInteractionTypes'

export interface HoverState {
  cursor: '' | 'grab' | 'move'
  edgeIndex: number | null
  polygon: Array<[number, number]> | null
}



export function resolveHoverState(
  map: maplibregl.Map,
  model: MapInteractionModel,
  point: { x: number; y: number },
): HoverState {
  const dragTolerancePx = zoomAdaptiveHitTolerancePx(DRAG_HIT_TOLERANCE_PX, map.getZoom())
  const hits = getHitFeatures(map, point, dragTolerancePx, [
    OBSTACLE_VERTEX_HIT_LAYER_ID,
    VERTEX_HIT_LAYER_ID,
    OBSTACLE_EDGE_HIT_LAYER_ID,
    EDGE_HIT_LAYER_ID,
  ])
  const obstacleVertexIndex = getVertexHit(hits, OBSTACLE_VERTEX_HIT_LAYER_ID)
  const roofVertexIndex = getVertexHit(hits, VERTEX_HIT_LAYER_ID)
  const obstacleEdgeIndex = getEdgeHit(hits, OBSTACLE_EDGE_HIT_LAYER_ID)
  const roofEdgeIndex = getEdgeHit(hits, EDGE_HIT_LAYER_ID)

  const activeObstacle = model.drawing.activeObstacle
  const obstaclePolygon =
    activeObstacle && activeObstacle.shape.type === 'polygon-prism' ? activeObstacle.shape.polygon : null
  const activeFootprint = model.drawing.activeFootprint
  const roofPolygon = activeFootprint?.vertices ?? null
  const canModifyRoofEdge = roofEdgeIndex !== null && !!roofPolygon && roofPolygon.length >= 3

  if (obstacleVertexIndex !== null || roofVertexIndex !== null) {
    return { cursor: 'grab', edgeIndex: null, polygon: null }
  }
  if (obstacleEdgeIndex !== null) {
    return { cursor: 'move', edgeIndex: obstacleEdgeIndex, polygon: obstaclePolygon }
  }
  if (canModifyRoofEdge) {
    return { cursor: 'move', edgeIndex: roofEdgeIndex, polygon: roofPolygon }
  }
  return { cursor: '', edgeIndex: null, polygon: null }
}



export function handleModeSelectionClick(
  map: maplibregl.Map,
  model: MapInteractionModel,
  point: { x: number; y: number },
  multiSelect: boolean,
): void {
  const clickTolerancePx = zoomAdaptiveHitTolerancePx(CLICK_HIT_TOLERANCE_PX, map.getZoom())
  const hits = getHitFeatures(map, point, clickTolerancePx, [
    VERTEX_HIT_LAYER_ID,
    EDGE_HIT_LAYER_ID,
    OBSTACLE_HIT_LAYER_ID,
    FOOTPRINT_HIT_LAYER_ID,
  ])

  const vertexIndex = getVertexHit(hits, VERTEX_HIT_LAYER_ID)
  if (vertexIndex !== null) {
    model.selection.onSelectVertex(vertexIndex)
    return
  }

  const edgeIndex = getEdgeHit(hits, EDGE_HIT_LAYER_ID)
  if (edgeIndex !== null) {
    model.selection.onSelectEdge(edgeIndex)
    return
  }

  const obstacleId = getObstacleHit(hits, OBSTACLE_HIT_LAYER_ID)
  if (obstacleId) {
    model.selection.onSelectObstacle(obstacleId, multiSelect)
    return
  }

  const footprintId = getFootprintHit(hits, FOOTPRINT_HIT_LAYER_ID)
  if (footprintId) {
    model.selection.onSelectFootprint(footprintId, multiSelect)
    return
  }

  model.selection.onClearSelection()
}



export function resolveMouseDownDragState(
  map: maplibregl.Map,
  model: MapInteractionModel,
  point: { x: number; y: number },
  lngLat: [number, number],
): DragState | null {
  const dragTolerancePx = zoomAdaptiveHitTolerancePx(DRAG_HIT_TOLERANCE_PX, map.getZoom())
  const hits = getHitFeatures(map, point, dragTolerancePx, [OBSTACLE_VERTEX_HIT_LAYER_ID, VERTEX_HIT_LAYER_ID, EDGE_HIT_LAYER_ID])
  const activeObstacle = model.drawing.activeObstacle
  const obstacleVertexIndex = getVertexHit(hits, OBSTACLE_VERTEX_HIT_LAYER_ID)
  if (activeObstacle && obstacleVertexIndex !== null) {
    return {
      type: 'vertex',
      target: 'obstacle',
      obstacleId: activeObstacle.id,
      index: obstacleVertexIndex,
      lastLngLat: lngLat,
      invalidAttempted: false,
    }
  }

  const activeFootprint = model.drawing.activeFootprint
  const vertexIndex = getVertexHit(hits, VERTEX_HIT_LAYER_ID)
  if (activeFootprint && vertexIndex !== null) {
    return {
      type: 'vertex',
      target: 'roof',
      index: vertexIndex,
      lastLngLat: lngLat,
      invalidAttempted: false,
    }
  }

  const edgeIndex = getEdgeHit(hits, EDGE_HIT_LAYER_ID)
  if (edgeIndex === null) {
    return null
  }
  return {
    type: 'edge',
    target: 'roof',
    index: edgeIndex,
    lastLngLat: lngLat,
    invalidAttempted: false,
  }
}



export function resolveVertexDragPolygon(
  model: MapInteractionModel,
  dragState: DragState,
): Array<[number, number]> | null {
  if (dragState.type === 'vertex' && dragState.target === 'obstacle') {
    if (!dragState.obstacleId) {
      return null
    }
    const activeObstacle = model.drawing.activeObstacle
    if (!activeObstacle || activeObstacle.id !== dragState.obstacleId || activeObstacle.shape.type !== 'polygon-prism') {
      return null
    }
    return activeObstacle.shape.polygon
  }

  if (dragState.type === 'vertex' && dragState.target === 'roof') {
    return model.drawing.activeFootprint?.vertices ?? null
  }

  return null
}



export function applyVertexDragMove(model: MapInteractionModel, dragState: DragState, point: [number, number]): boolean {
  if (dragState.type === 'vertex' && dragState.target === 'obstacle') {
    if (!dragState.obstacleId) {
      return false
    }
    return model.selection.onMoveObstacleVertex(dragState.obstacleId, dragState.index, point)
  }
  if (dragState.type === 'vertex' && dragState.target === 'roof') {
    return model.selection.onMoveVertex(dragState.index, point)
  }
  return false
}
