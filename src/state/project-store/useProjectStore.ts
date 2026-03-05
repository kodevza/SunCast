import { useEffect, useMemo, useReducer } from 'react'
import type {
  EdgeHeightConstraint,
  FaceConstraints,
  FootprintPolygon,
  ProjectData,
  VertexHeightConstraint,
} from '../../types/geometry'

const STORAGE_KEY = 'suncast.project.v1'
const SOLVER_CONFIG_VERSION = 'uc0.1'

interface ProjectState {
  footprint: FootprintPolygon | null
  constraints: FaceConstraints
  drawDraft: Array<[number, number]>
  isDrawing: boolean
}

type Action =
  | { type: 'START_DRAW' }
  | { type: 'CANCEL_DRAW' }
  | { type: 'ADD_DRAFT_POINT'; point: [number, number] }
  | { type: 'UNDO_DRAFT_POINT' }
  | { type: 'COMMIT_FOOTPRINT' }
  | { type: 'SET_FOOTPRINT'; footprint: FootprintPolygon }
  | { type: 'SET_VERTEX_HEIGHT'; payload: VertexHeightConstraint }
  | { type: 'SET_EDGE_HEIGHT'; payload: EdgeHeightConstraint }
  | { type: 'CLEAR_VERTEX_HEIGHT'; vertexIndex: number }
  | { type: 'CLEAR_EDGE_HEIGHT'; edgeIndex: number }
  | { type: 'LOAD'; payload: ProjectData }

const initialState: ProjectState = {
  footprint: null,
  constraints: { vertexHeights: [], edgeHeights: [] },
  drawDraft: [],
  isDrawing: false,
}

function setOrReplaceVertexConstraint(
  constraints: VertexHeightConstraint[],
  value: VertexHeightConstraint,
): VertexHeightConstraint[] {
  const next = constraints.filter((c) => c.vertexIndex !== value.vertexIndex)
  next.push(value)
  return next.sort((a, b) => a.vertexIndex - b.vertexIndex)
}

function setOrReplaceEdgeConstraint(
  constraints: EdgeHeightConstraint[],
  value: EdgeHeightConstraint,
): EdgeHeightConstraint[] {
  const next = constraints.filter((c) => c.edgeIndex !== value.edgeIndex)
  next.push(value)
  return next.sort((a, b) => a.edgeIndex - b.edgeIndex)
}

function reducer(state: ProjectState, action: Action): ProjectState {
  switch (action.type) {
    case 'START_DRAW':
      return { ...state, isDrawing: true, drawDraft: [] }
    case 'CANCEL_DRAW':
      return { ...state, isDrawing: false, drawDraft: [] }
    case 'ADD_DRAFT_POINT':
      return {
        ...state,
        drawDraft: [...state.drawDraft, action.point],
      }
    case 'UNDO_DRAFT_POINT':
      return {
        ...state,
        drawDraft: state.drawDraft.slice(0, -1),
      }
    case 'COMMIT_FOOTPRINT': {
      if (state.drawDraft.length < 3) {
        return state
      }
      const footprint: FootprintPolygon = {
        id: `fp-${Date.now()}`,
        vertices: state.drawDraft,
      }
      return {
        ...state,
        footprint,
        isDrawing: false,
        drawDraft: [],
        constraints: { vertexHeights: [], edgeHeights: [] },
      }
    }
    case 'SET_FOOTPRINT':
      return {
        ...state,
        footprint: action.footprint,
      }
    case 'SET_VERTEX_HEIGHT':
      return {
        ...state,
        constraints: {
          ...state.constraints,
          vertexHeights: setOrReplaceVertexConstraint(state.constraints.vertexHeights, action.payload),
        },
      }
    case 'SET_EDGE_HEIGHT':
      return {
        ...state,
        constraints: {
          ...state.constraints,
          edgeHeights: setOrReplaceEdgeConstraint(state.constraints.edgeHeights, action.payload),
        },
      }
    case 'CLEAR_VERTEX_HEIGHT':
      return {
        ...state,
        constraints: {
          ...state.constraints,
          vertexHeights: state.constraints.vertexHeights.filter((c) => c.vertexIndex !== action.vertexIndex),
        },
      }
    case 'CLEAR_EDGE_HEIGHT':
      return {
        ...state,
        constraints: {
          ...state.constraints,
          edgeHeights: state.constraints.edgeHeights.filter((c) => c.edgeIndex !== action.edgeIndex),
        },
      }
    case 'LOAD':
      return {
        ...state,
        footprint: action.payload.footprint,
        constraints: action.payload.constraints,
      }
    default:
      return state
  }
}

function readStorage(): ProjectData | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as ProjectData
    return parsed
  } catch {
    return null
  }
}

export function useProjectStore() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const stored = readStorage()
    if (stored) {
      dispatch({ type: 'LOAD', payload: stored })
    }
  }, [])

  useEffect(() => {
    const data: ProjectData = {
      footprint: state.footprint,
      constraints: state.constraints,
      solverConfigVersion: SOLVER_CONFIG_VERSION,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [state.footprint, state.constraints])

  return useMemo(
    () => ({
      state,
      startDrawing: () => dispatch({ type: 'START_DRAW' }),
      cancelDrawing: () => dispatch({ type: 'CANCEL_DRAW' }),
      addDraftPoint: (point: [number, number]) => dispatch({ type: 'ADD_DRAFT_POINT', point }),
      undoDraftPoint: () => dispatch({ type: 'UNDO_DRAFT_POINT' }),
      commitFootprint: () => dispatch({ type: 'COMMIT_FOOTPRINT' }),
      setVertexHeight: (vertexIndex: number, heightM: number) =>
        dispatch({ type: 'SET_VERTEX_HEIGHT', payload: { vertexIndex, heightM } }),
      setEdgeHeight: (edgeIndex: number, heightM: number) =>
        dispatch({ type: 'SET_EDGE_HEIGHT', payload: { edgeIndex, heightM } }),
      clearVertexHeight: (vertexIndex: number) => dispatch({ type: 'CLEAR_VERTEX_HEIGHT', vertexIndex }),
      clearEdgeHeight: (edgeIndex: number) => dispatch({ type: 'CLEAR_EDGE_HEIGHT', edgeIndex }),
    }),
    [state],
  )
}
