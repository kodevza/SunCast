import type {
  FaceConstraints,
  FootprintPolygon,
  ObstacleKind,
  ObstacleStateEntry,
  ProjectSunProjectionSettings,
  ShadingSettings,
  VertexHeightConstraint,
} from '../../types/geometry'

export interface FootprintStateEntry {
  footprint: FootprintPolygon
  constraints: FaceConstraints
  pitchAdjustmentPercent: number
}

export interface ImportedFootprintEntry {
  footprintId: string
  polygon: Array<[number, number]>
  vertexHeights: VertexHeightConstraint[]
}

export interface ProjectState {
  footprints: Record<string, FootprintStateEntry>
  obstacles: Record<string, ObstacleStateEntry>
  sunProjection: ProjectSunProjectionSettings
  shadingSettings: ShadingSettings
}

export type Action =


  | { type: 'DELETE_FOOTPRINT'; footprintId: string }
  | {
      type: 'ADD_FOOTPRINT'
      payload: { footprint: FootprintPolygon }
    }
  | {
      type: 'MOVE_FOOTPRINT_VERTEX'
      payload: { footprintId: string; vertexIndex: number; point: [number, number] }
    }
  | {
      type: 'MOVE_FOOTPRINT_EDGE'
      payload: { footprintId: string; edgeIndex: number; delta: [number, number] }
    }
  | { type: 'SET_FOOTPRINT_VERTEX_HEIGHTS'; payload: { footprintId: string; constraints: VertexHeightConstraint[] } }
  | { type: 'SET_FOOTPRINT_EDGE_HEIGHT'; payload: { footprintId: string; edgeIndex: number; heightM: number } }
  | { type: 'SET_FOOTPRINT_KWP'; payload: { footprintId: string; kwp: number } }
  | { type: 'SET_FOOTPRINT_PITCH_ADJUSTMENT_PERCENT'; payload: { footprintId: string; pitchAdjustmentPercent: number } }
  | { type: 'CLEAR_FOOTPRINT_VERTEX_HEIGHT'; payload: { footprintId: string; vertexIndex: number } }
  | { type: 'CLEAR_FOOTPRINT_EDGE_HEIGHT'; payload: { footprintId: string; edgeIndex: number } }
  | { type: 'SET_SUN_PROJECTION_ENABLED'; enabled: boolean }
  | { type: 'SET_SUN_PROJECTION_DATETIME'; datetimeIso: string | null }
  | { type: 'SET_SUN_PROJECTION_DAILY_DATE'; dailyDateIso: string | null }
  
  | {
      type: 'ADD_OBSTACLE'
      payload: {
        obstacle: ObstacleStateEntry
      }
    }
  | { type: 'DELETE_OBSTACLE'; obstacleId: string }
  | { type: 'SET_OBSTACLE_HEIGHT'; payload: { obstacleId: string; heightAboveGroundM: number } }
  | { type: 'SET_OBSTACLE_KIND'; payload: { obstacleId: string; kind: ObstacleKind } }
  | {
      type: 'MOVE_OBSTACLE_VERTEX'
      payload: { obstacleId: string; vertexIndex: number; point: [number, number] }
    }
  | { type: 'SET_SHADING_ENABLED'; enabled: boolean }
  | { type: 'SET_SHADING_GRID_RESOLUTION'; gridResolutionM: number }
  | { type: 'UPSERT_IMPORTED_FOOTPRINTS'; entries: ImportedFootprintEntry[] }
  | { type: 'RESET_STATE' }
  | { type: 'LOAD'; payload: ProjectState }
