import type maplibregl from 'maplibre-gl'
import type { MutableRefObject } from 'react'
import { edgeLengthMeters } from './mapViewGeoJson'
import type {
  DragState,
  DrawingAngleHint,
  HoveredEdgeLength,
  MapInteractionModel,
  OrbitSteerState,
  VertexDragAngleHint,
} from './mapInteractionTypes'

export interface CreateMapInteractionHandlersArgs {
  map: maplibregl.Map
  modelRef: MutableRefObject<MapInteractionModel>
  constrainedDrawLengthM: number | null
  hoveredEdgeLengthRef: MutableRefObject<HoveredEdgeLength | null>
  dragStateRef: MutableRefObject<DragState | null>
  orbitSteerStateRef: MutableRefObject<OrbitSteerState | null>
  setHoveredEdgeLength: (value: HoveredEdgeLength | null) => void
  setDrawingAngleHint: (value: DrawingAngleHint | null) => void
  setVertexDragAngleHint: (value: VertexDragAngleHint | null) => void
  setDraftPreviewPoint: (value: [number, number] | null) => void
}

export function getEventLngLat(event: maplibregl.MapMouseEvent): [number, number] {
  return [event.lngLat.lng, event.lngLat.lat]
}

export function isSnapDisabled(event: maplibregl.MapMouseEvent): boolean {
  return event.originalEvent instanceof MouseEvent && event.originalEvent.shiftKey
}

export function isMultiSelect(event: maplibregl.MapMouseEvent & { originalEvent: MouseEvent }): boolean {
  return event.originalEvent.ctrlKey || event.originalEvent.metaKey
}

export function setVertexAngleHint(
  setVertexDragAngleHint: (value: VertexDragAngleHint | null) => void,
  event: maplibregl.MapMouseEvent,
  angleDeg: number | null,
): void {
  if (angleDeg === null) {
    setVertexDragAngleHint(null)
    return
  }

  setVertexDragAngleHint({
    left: event.point.x,
    top: event.point.y,
    angleDeg,
  })
}

export function startDrag(
  map: maplibregl.Map,
  modelRef: MutableRefObject<MapInteractionModel>,
  dragStateRef: MutableRefObject<DragState | null>,
  dragState: DragState,
  setVertexDragAngleHint: (value: VertexDragAngleHint | null) => void,
): void {
  dragStateRef.current = dragState
  modelRef.current.camera.onGeometryDragStateChange(true)
  map.dragPan.disable()
  map.getCanvas().style.cursor = 'grabbing'
  setVertexDragAngleHint(null)
}

export function setHoverCursor(map: maplibregl.Map, hasVertexHit: boolean, hasEdgeHit: boolean): void {
  if (hasVertexHit) {
    map.getCanvas().style.cursor = 'grab'
  } else if (hasEdgeHit) {
    map.getCanvas().style.cursor = 'move'
  } else {
    map.getCanvas().style.cursor = ''
  }
}

export function setHoveredEdgeLengthForPolygon(
  map: maplibregl.Map,
  polygon: Array<[number, number]> | null,
  edgeIndex: number | null,
  setHoveredEdgeLength: (value: HoveredEdgeLength | null) => void,
): void {
  if (edgeIndex === null || !polygon || polygon.length < 2) {
    setHoveredEdgeLength(null)
    return
  }

  const lengthM = edgeLengthMeters(polygon, edgeIndex)
  if (lengthM === null) {
    setHoveredEdgeLength(null)
    return
  }

  const start = polygon[edgeIndex]
  const end = polygon[(edgeIndex + 1) % polygon.length]
  const midLon = (start[0] + end[0]) / 2
  const midLat = (start[1] + end[1]) / 2
  const midScreen = map.project({ lng: midLon, lat: midLat })
  setHoveredEdgeLength({ left: midScreen.x, top: midScreen.y, lengthM })
}
