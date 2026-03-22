import type { DrawEditMode } from '../DrawTools/model/drawTools.types'
import type { SunProjectionResult } from '../../../../geometry/sun/sunProjection'
import type {
  FaceConstraints,
  FootprintPolygon,
  ObstacleStateEntry,
  RoofMeshData,
} from '../../../../types/geometry'
import type { BinaryShadedCell, RoofShadingComputeState } from '../../../analysis/analysis.types'
import type { ComputeRoofShadeGridResult } from '../../../../geometry/shading'
import type { ActiveHeatmapMode } from '../../../analysis/analysis.types'
import type { MapNavigationRuntime } from '../../place-search/useMapNavigationRuntime'

export interface SunCastMapViewModel {
  drawing: {
    editMode: DrawEditMode
    footprints: FootprintPolygon[]
    activeFootprint: FootprintPolygon | null
    selectedFootprintIds: string[]
    drawDraftRoof: Array<[number, number]>
    isDrawingRoof: boolean
    obstacles: ObstacleStateEntry[]
    activeObstacle: ObstacleStateEntry | null
    selectedObstacleIds: string[]
    drawDraftObstacle: Array<[number, number]>
    isDrawingObstacle: boolean
    onMapClick: (point: [number, number]) => void
    onCloseDrawing: () => void
    onObstacleMapClick: (point: [number, number]) => void
    onCloseObstacleDrawing: () => void
  }
  selection: {
    vertexConstraints: FaceConstraints['vertexHeights']
    selectedVertexIndex: number | null
    selectedEdgeIndex: number | null
    onSelectVertex: (vertexIndex: number) => void
    onSelectEdge: (edgeIndex: number) => void
    onSelectFootprint: (footprintId: string, multiSelect: boolean) => void
    onSelectObstacle: (obstacleId: string, multiSelect: boolean) => void
    onClearSelection: () => void
    onMoveVertex: (vertexIndex: number, point: [number, number]) => boolean
    onMoveEdge: (edgeIndex: number, delta: [number, number]) => boolean
    onMoveObstacleVertex: (obstacleId: string, vertexIndex: number, point: [number, number]) => boolean
    onMoveRejected: () => void
    onAdjustHeight: (stepM: number) => void
  }
  view: {
    orbitEnabled: boolean
    showSolveHint: boolean
    sunProjectionResult: SunProjectionResult | null
    sunPerspectiveCameraPose: {
      bearingDeg: number
      pitchDeg: number
    } | null
    mapNavigation: MapNavigationRuntime
    onToggleOrbit: () => void
    onBearingChange: (bearingDeg: number) => void
    onPitchChange: (pitchDeg: number) => void
    onGeometryDragStateChange: (dragging: boolean) => void
  }
  render: {
    shadingMode: ActiveHeatmapMode
    shadingEnabled: boolean
    shadingCells: BinaryShadedCell[]
    shadingResult: ComputeRoofShadeGridResult | null
    shadingComputeState: RoofShadingComputeState
    roofMeshes: RoofMeshData[]
    obstacleMeshes: RoofMeshData[]
  }
}
