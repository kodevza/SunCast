import type { FaceConstraints, FootprintPolygon, LngLat, VertexHeightConstraint } from '../../types/geometry'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'

// Runtime-only editor state that should never be treated as canonical persisted data.
export interface EditorSessionState {
  activeFootprintId: string | null
  selectedFootprintIds: string[]
  drawDraft: Array<[number, number]>
  isDrawing: boolean
  activeObstacleId: string | null
  selectedObstacleIds: string[]
  obstacleDrawDraft: Array<[number, number]>
  isDrawingObstacle: boolean
}


export const initialEditorSessionState: EditorSessionState = {
  activeFootprintId: null,
  selectedFootprintIds: [],
  drawDraft: [],
  isDrawing: false,
  activeObstacleId: null,
  selectedObstacleIds: [],
  obstacleDrawDraft: [],
  isDrawingObstacle: false,
}

export type EditorAction =
  | { type: 'START_DRAW' }
  | { type: 'CANCEL_DRAW' }
  | { type: 'ADD_DRAFT_POINT'; point: [number, number] }
  | { type: 'UNDO_DRAFT_POINT' }
  | { type: 'SET_ACTIVE_FOOTPRINT'; footprintId: string }
  | { type: 'SELECT_ONLY_FOOTPRINT'; footprintId: string }
  | { type: 'TOGGLE_FOOTPRINT_SELECTION'; footprintId: string }
  | { type: 'SELECT_ALL_FOOTPRINTS' }
  | { type: 'CLEAR_FOOTPRINT_SELECTION' }
  | { type: 'ADD_FOOTPRINT' }
  | { type: 'SET_ACTIVE_OBSTACLE'; obstacleId: string }
  | { type: 'CLEAR_OBSTACLE_SELECTION' }
  | { type: 'SELECT_ONLY_OBSTACLE'; obstacleId: string }
  | { type: 'TOGGLE_OBSTACLE_SELECTION'; obstacleId: string }
  | { type: 'START_OBSTACLE_DRAW' }
  | { type: 'CANCEL_OBSTACLE_DRAW' }
  | { type: 'ADD_OBSTACLE_DRAFT_POINT'; point: [number, number] }
  | { type: 'UNDO_OBSTACLE_DRAFT_POINT' }
  | { type: 'RESET_STATE' }

export interface EditModeState {
  editMode: 'roof' | 'obstacle'
  setEditMode: Dispatch<SetStateAction<'roof' | 'obstacle'>>
}

export interface TutorialState {
  tutorialEditedKwpByFootprint: Record<string, true>
  setTutorialEditedKwpByFootprint: Dispatch<SetStateAction<Record<string, true>>>
  tutorialDatetimeEdited: boolean
  setTutorialDatetimeEdited: Dispatch<SetStateAction<boolean>>
  tutorialStartRef: MutableRefObject<() => void>
  setTutorialStart: (startTutorial: () => void) => void
}

export interface GeometrySelectionStateArgs {
  activeFootprint: FootprintPolygon | null
  isDrawing: boolean
  onSelectionChange?: () => void
}

export interface GeometrySelectionState {
  selectedVertexIndex: number | null
  selectedEdgeIndex: number | null
  safeSelectedVertexIndex: number | null
  safeSelectedEdgeIndex: number | null
  clearSelectionState: () => void
  selectVertex: (vertexIndex: number) => void
  selectEdge: (edgeIndex: number) => void
}

export interface GeometryEditingArgs {
  activeFootprint: FootprintPolygon | null
  activeConstraints: FaceConstraints
  isDrawing: boolean
  selection: Pick<GeometrySelectionState, 'selectedVertexIndex' | 'selectedEdgeIndex' | 'safeSelectedVertexIndex' | 'safeSelectedEdgeIndex'>
  moveFootprintVertex: (footprintId: string, vertexIndex: number, point: LngLat) => void
  moveFootprintEdge: (footprintId: string, edgeIndex: number, delta: LngLat) => void
  setVertexHeight: (footprintId: string, vertexIndex: number, heightM: number) => boolean
  setVertexHeights: (footprintId: string, constraints: VertexHeightConstraint[]) => boolean
  setEdgeHeight: (footprintId: string, edgeIndex: number, heightM: number) => boolean
}

export interface GeometryEditingState {
  interactionError: string | null
  isGeometryDragActive: boolean
  setIsGeometryDragActive: Dispatch<SetStateAction<boolean>>
  moveVertexIfValid: (vertexIndex: number, point: LngLat) => boolean
  moveEdgeIfValid: (edgeIndex: number, delta: LngLat) => boolean
  applyHeightStep: (stepM: number) => void
  setConstraintLimitError: () => void
  setMoveRejectedError: () => void
  clearInteractionError: () => void
}

export interface EditorRuntimeState {
  editMode: EditModeState
  tutorial: TutorialState
  geometrySelection: GeometrySelectionState
  geometryEditing: GeometryEditingState
}
