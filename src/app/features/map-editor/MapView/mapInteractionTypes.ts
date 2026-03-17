import type maplibregl from 'maplibre-gl'
import type { RefObject } from 'react'
import type { FootprintPolygon, ObstacleStateEntry } from '../../../../types/geometry'

export interface DragState {
  type: 'vertex' | 'edge'
  target: 'roof' | 'obstacle'
  obstacleId?: string
  index: number
  lastLngLat: [number, number]
  invalidAttempted: boolean
}

export interface HoveredEdgeLength {
  left: number
  top: number
  lengthM: number
}

export interface VertexDragAngleHint {
  left: number
  top: number
  angleDeg: number
}

export interface DrawingAngleHint {
  left: number
  top: number
  angleDeg: number | null
  azimuthDeg: number | null
  angleFromSouthDeg: number | null
  secondPointPreview: boolean
  lengthM: number
  snapped: boolean
}

export interface MapViewDrawingModel {
  editMode: 'roof' | 'obstacle'
  drawDraft: Array<[number, number]>
  isDrawing: boolean
  activeFootprint: FootprintPolygon | null
  activeObstacle: ObstacleStateEntry | null
  commitDrawPoint: (point: [number, number]) => void
  closeDrawing: () => void
}

export interface MapViewSelectionModel {
  onSelectVertex: (vertexIndex: number) => void
  onSelectEdge: (edgeIndex: number) => void
  onSelectFootprint: (footprintId: string, multiSelect: boolean) => void
  onSelectObstacle: (obstacleId: string, multiSelect: boolean) => void
  onClearSelection: () => void
  onMoveVertex: (vertexIndex: number, point: [number, number]) => boolean
  onMoveEdge: (edgeIndex: number, delta: [number, number]) => boolean
  onMoveObstacleVertex: (obstacleId: string, vertexIndex: number, point: [number, number]) => boolean
  onMoveRejected: () => void
}

export interface MapViewCameraModel {
  orbitEnabled: boolean
  onBearingChange: (bearingDeg: number) => void
  onPitchChange: (pitchDeg: number) => void
  onGeometryDragStateChange: (dragging: boolean) => void
}

export interface MapInteractionModel {
  drawing: MapViewDrawingModel
  selection: MapViewSelectionModel
  camera: MapViewCameraModel
}

export interface UseMapInteractionsArgs {
  mapRef: RefObject<maplibregl.Map | null>
  mapLoaded: boolean
  model: MapInteractionModel
  constrainedDrawLengthM: number | null
}

export interface UseMapInteractionsResult {
  hoveredEdgeLength: HoveredEdgeLength | null
  drawingAngleHint: DrawingAngleHint | null
  vertexDragAngleHint: VertexDragAngleHint | null
  draftPreviewPoint: [number, number] | null
}

export interface OrbitSteerState {
  lastScreenPoint: [number, number]
}
