import type maplibregl from 'maplibre-gl'
import {
  DRAW_CLOSE_SNAP_TOLERANCE_PX,
} from './mapViewConstants'
import {
  angleFromSouthDeg,
  pointAtDistanceMeters,
  segmentAzimuthDeg,
  segmentLengthMeters,
  snapDrawPointToRightAngle,
  snapVertexPointToRightAngle,
} from './drawingAssist'
import type { DrawingAngleHint } from './mapInteractionTypes'

interface DrawingInteraction {
  snapped: ReturnType<typeof snapDrawPointToRightAngle>
  closePolygonPoint: [number, number] | null
  previewPoint: [number, number]
  lengthM: number
  secondPointPreview: boolean
  azimuthDeg: number | null
}

function getClosePolygonSnapPoint(
  map: maplibregl.Map,
  drawDraft: Array<[number, number]>,
  point: [number, number],
): [number, number] | null {
  if (drawDraft.length < 3) {
    return null
  }

  const firstPoint = drawDraft[0]
  const firstPointScreen = map.project({ lng: firstPoint[0], lat: firstPoint[1] })
  const cursorScreen = map.project({ lng: point[0], lat: point[1] })
  const dx = cursorScreen.x - firstPointScreen.x
  const dy = cursorScreen.y - firstPointScreen.y
  const distancePx = Math.sqrt(dx * dx + dy * dy)

  return distancePx <= DRAW_CLOSE_SNAP_TOLERANCE_PX ? firstPoint : null
}

function getDrawPoint(
  drawDraft: Array<[number, number]>,
  rawPoint: [number, number],
  disableSnap: boolean,
  constrainedDrawLengthM: number | null,
) {
  const snapped = snapDrawPointToRightAngle(drawDraft, rawPoint, { snapEnabled: !disableSnap })
  if (drawDraft.length < 1 || constrainedDrawLengthM === null) {
    return snapped
  }
  return {
    ...snapped,
    point: pointAtDistanceMeters(drawDraft[drawDraft.length - 1], snapped.point, constrainedDrawLengthM),
  }
}

export function getVertexDragPoint(
  polygon: Array<[number, number]> | null,
  vertexIndex: number,
  rawPoint: [number, number],
  disableSnap: boolean,
) {
  if (!polygon) {
    return { point: rawPoint, angleDeg: null }
  }
  return snapVertexPointToRightAngle(polygon, vertexIndex, rawPoint, { snapEnabled: !disableSnap })
}

export function computeDrawingInteraction(
  map: maplibregl.Map,
  drawDraft: Array<[number, number]>,
  rawPoint: [number, number],
  disableSnap: boolean,
  constrainedDrawLengthM: number | null,
): DrawingInteraction | null {
  if (drawDraft.length < 1) {
    return null
  }

  const snapped = getDrawPoint(drawDraft, rawPoint, disableSnap, constrainedDrawLengthM)
  const closePolygonPoint = disableSnap ? null : getClosePolygonSnapPoint(map, drawDraft, snapped.point)
  const previewPoint = closePolygonPoint ?? snapped.point

  return {
    snapped,
    closePolygonPoint,
    previewPoint,
    lengthM: segmentLengthMeters(drawDraft[drawDraft.length - 1], previewPoint),
    secondPointPreview: drawDraft.length === 1,
    azimuthDeg: drawDraft.length === 1 ? segmentAzimuthDeg(drawDraft[0], previewPoint) : null,
  }
}

export function buildDrawingAngleHint(
  drawDraftLength: number,
  interaction: DrawingInteraction,
  event: maplibregl.MapMouseEvent,
): DrawingAngleHint {
  return {
    left: event.point.x,
    top: event.point.y,
    angleDeg: drawDraftLength >= 2 ? interaction.snapped.angleDeg : null,
    azimuthDeg: interaction.azimuthDeg,
    angleFromSouthDeg: interaction.azimuthDeg !== null ? angleFromSouthDeg(interaction.azimuthDeg) : null,
    secondPointPreview: interaction.secondPointPreview,
    lengthM: interaction.lengthM,
    snapped: interaction.snapped.snapped || interaction.closePolygonPoint !== null,
  }
}
