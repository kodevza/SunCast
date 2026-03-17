import type maplibregl from 'maplibre-gl'
import type { MutableRefObject } from 'react'
import {
  MAX_ORBIT_PITCH_DEG,
  ORBIT_STEER_BEARING_PER_PIXEL_DEG,
  ORBIT_STEER_PITCH_PER_PIXEL_DEG,
} from './mapViewConstants'
import {
  applyVertexDragMove,
  resolveHoverState,
  resolveVertexDragPolygon,
} from './mapInteractionEditMode'
import type {
  DragState,
  HoveredEdgeLength,
  MapInteractionModel,
  OrbitSteerState,
  VertexDragAngleHint,
} from './mapInteractionTypes'
import {
  getEventLngLat,
  isSnapDisabled,
  setHoverCursor,
  setHoveredEdgeLengthForPolygon,
  setVertexAngleHint,
} from './mapInteractionHandlers.common'
import { getVertexDragPoint } from './mapInteractionHandlers.drawings'

interface HandleHoverSelectionArgs {
  map: maplibregl.Map
  modelRef: MutableRefObject<MapInteractionModel>
  dragStateRef: MutableRefObject<DragState | null>
  hoveredEdgeLengthRef: MutableRefObject<HoveredEdgeLength | null>
  event: maplibregl.MapMouseEvent
  setHoveredEdgeLength: (value: HoveredEdgeLength | null) => void
}

export function handleHoverSelection({
  map,
  modelRef,
  dragStateRef,
  hoveredEdgeLengthRef,
  event,
  setHoveredEdgeLength,
}: HandleHoverSelectionArgs): void {
  const { drawing, camera } = modelRef.current
  if (drawing.isDrawing || camera.orbitEnabled || dragStateRef.current) {
    if (hoveredEdgeLengthRef.current !== null) {
      setHoveredEdgeLength(null)
    }
    return
  }

  const hoverState = resolveHoverState(map, modelRef.current, event.point)
  setHoverCursor(map, hoverState.cursor === 'grab', hoverState.cursor === 'move')
  setHoveredEdgeLengthForPolygon(map, hoverState.polygon, hoverState.edgeIndex, setHoveredEdgeLength)
}

interface HandleDragMoveArgs {
  modelRef: MutableRefObject<MapInteractionModel>
  dragStateRef: MutableRefObject<DragState | null>
  setVertexDragAngleHint: (value: VertexDragAngleHint | null) => void
  event: maplibregl.MapMouseEvent
}

export function handleDragMove({
  modelRef,
  dragStateRef,
  setVertexDragAngleHint,
  event,
}: HandleDragMoveArgs): void {
  const { drawing, selection, camera } = modelRef.current
  const dragState = dragStateRef.current
  if (!dragState || drawing.isDrawing || camera.orbitEnabled) {
    return
  }

  if (dragState.type === 'vertex') {
    const rawPoint = getEventLngLat(event)
    const disableSnap = isSnapDisabled(event)
    const moved = getVertexDragPoint(
      resolveVertexDragPolygon(modelRef.current, dragState),
      dragState.index,
      rawPoint,
      disableSnap,
    )
    const movedPoint = moved.point
    const applied = applyVertexDragMove(modelRef.current, dragState, movedPoint)
    if (!applied) {
      dragState.invalidAttempted = true
    } else {
      setVertexAngleHint(setVertexDragAngleHint, event, moved.angleDeg)
      dragState.lastLngLat = movedPoint
    }
    return
  }

  const deltaLng = event.lngLat.lng - dragState.lastLngLat[0]
  const deltaLat = event.lngLat.lat - dragState.lastLngLat[1]
  if (deltaLng === 0 && deltaLat === 0) {
    return
  }

  const applied = selection.onMoveEdge(dragState.index, [deltaLng, deltaLat])
  if (!applied) {
    dragState.invalidAttempted = true
    return
  }

  dragState.lastLngLat = [event.lngLat.lng, event.lngLat.lat]
}

export function handleOrbitSteerMove(
  map: maplibregl.Map,
  modelRef: MutableRefObject<MapInteractionModel>,
  orbitSteerStateRef: MutableRefObject<OrbitSteerState | null>,
  event: maplibregl.MapMouseEvent,
): void {
  const orbitSteerState = orbitSteerStateRef.current
  if (!orbitSteerState || !modelRef.current.camera.orbitEnabled) {
    return
  }

  const deltaX = event.point.x - orbitSteerState.lastScreenPoint[0]
  const deltaY = event.point.y - orbitSteerState.lastScreenPoint[1]
  if (deltaX === 0 && deltaY === 0) {
    return
  }

  map.jumpTo({
    bearing: map.getBearing() + deltaX * ORBIT_STEER_BEARING_PER_PIXEL_DEG,
    pitch: Math.max(0, Math.min(MAX_ORBIT_PITCH_DEG, map.getPitch() - deltaY * ORBIT_STEER_PITCH_PER_PIXEL_DEG)),
  })
  orbitSteerState.lastScreenPoint = [event.point.x, event.point.y]
}
