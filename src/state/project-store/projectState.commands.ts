import type { Dispatch } from 'react'
import type { ObstacleKind, ObstacleStateEntry, FootprintPolygon, VertexHeightConstraint } from '../../types/geometry'
import { assertValidVertexHeights, setOrReplaceVertexConstraint } from './projectState.constraints'
import type { Action, ImportedFootprintEntry } from './projectState.types'

type ProjectCommandFootprintEntry = {
  footprint: {
    vertices: Array<[number, number]>
  }
  constraints: {
    vertexHeights: VertexHeightConstraint[]
  }
}

type ProjectCommandState = {
  footprints: Record<string, ProjectCommandFootprintEntry>
  obstacles: Record<string, ObstacleStateEntry>
}

export interface ProjectCommands {
  addFootprint: (footprint: FootprintPolygon) => void
  deleteFootprint: (footprintId: string) => void
  moveFootprintVertex: (footprintId: string, vertexIndex: number, point: [number, number]) => void
  moveFootprintEdge: (footprintId: string, edgeIndex: number, delta: [number, number]) => void
  setFootprintVertexHeight: (footprintId: string, vertexIndex: number, heightM: number) => boolean
  setFootprintEdgeHeight: (footprintId: string, edgeIndex: number, heightM: number) => boolean
  setFootprintVertexHeights: (footprintId: string, constraints: VertexHeightConstraint[]) => boolean
  clearFootprintVertexHeight: (footprintId: string, vertexIndex: number) => void
  clearFootprintEdgeHeight: (footprintId: string, edgeIndex: number) => void
  setFootprintKwp: (footprintId: string, kwp: number) => boolean
  setFootprintPitchAdjustmentPercent: (footprintId: string, pitchAdjustmentPercent: number) => boolean
  addObstacle: (obstacle: ObstacleStateEntry) => void
  deleteObstacle: (obstacleId: string) => void
  moveObstacleVertex: (obstacleId: string, vertexIndex: number, point: [number, number]) => boolean
  setObstacleHeight: (obstacleId: string, heightAboveGroundM: number) => boolean
  setObstacleKind: (obstacleId: string, kind: ObstacleKind) => boolean
  setSunProjectionEnabled: (enabled: boolean) => void
  setSunProjectionDatetimeIso: (datetimeIso: string | null) => void
  setSunProjectionDailyDateIso: (dailyDateIso: string | null) => void
  setShadingEnabled: (enabled: boolean) => void
  setShadingGridResolutionM: (gridResolutionM: number) => boolean
  upsertImportedFootprints: (entries: ImportedFootprintEntry[]) => boolean
  resetState: () => void
}

function withDispatch(dispatch: Dispatch<Action>) {
  return {
    addFootprint: (footprint: FootprintPolygon) => dispatch({ type: 'ADD_FOOTPRINT', payload: { footprint } }),
    deleteFootprint: (footprintId: string) => dispatch({ type: 'DELETE_FOOTPRINT', footprintId }),
    moveFootprintVertex: (footprintId: string, vertexIndex: number, point: [number, number]) =>
      dispatch({ type: 'MOVE_FOOTPRINT_VERTEX', payload: { footprintId, vertexIndex, point } }),
    moveFootprintEdge: (footprintId: string, edgeIndex: number, delta: [number, number]) =>
      dispatch({ type: 'MOVE_FOOTPRINT_EDGE', payload: { footprintId, edgeIndex, delta } }),
    addObstacle: (obstacle: ObstacleStateEntry) => dispatch({ type: 'ADD_OBSTACLE', payload: { obstacle } }),
    deleteObstacle: (obstacleId: string) => dispatch({ type: 'DELETE_OBSTACLE', obstacleId }),
    setSunProjectionEnabled: (enabled: boolean) => dispatch({ type: 'SET_SUN_PROJECTION_ENABLED', enabled }),
    setSunProjectionDatetimeIso: (datetimeIso: string | null) =>
      dispatch({ type: 'SET_SUN_PROJECTION_DATETIME', datetimeIso }),
    setSunProjectionDailyDateIso: (dailyDateIso: string | null) =>
      dispatch({ type: 'SET_SUN_PROJECTION_DAILY_DATE', dailyDateIso }),
    setShadingEnabled: (enabled: boolean) => dispatch({ type: 'SET_SHADING_ENABLED', enabled }),
    resetState: () => dispatch({ type: 'RESET_STATE' }),
  }
}

export function createProjectCommands(
  dispatch: Dispatch<Action>,
  getState: () => ProjectCommandState,
): ProjectCommands {
  const dispatchOnly = withDispatch(dispatch)

  return {
    ...dispatchOnly,
    setFootprintVertexHeight: (footprintId: string, vertexIndex: number, heightM: number) => {
      if (!Number.isFinite(heightM)) {
        return false
      }

      const footprint = getState().footprints[footprintId]
      if (!footprint || vertexIndex < 0 || vertexIndex >= footprint.footprint.vertices.length) {
        return false
      }

      const nextConstraints = setOrReplaceVertexConstraint(footprint.constraints.vertexHeights, {
        vertexIndex,
        heightM,
      })
      dispatch({
        type: 'SET_FOOTPRINT_VERTEX_HEIGHTS',
        payload: { footprintId, constraints: nextConstraints },
      })
      return true
    },
    setFootprintEdgeHeight: (footprintId: string, edgeIndex: number, heightM: number) => {
      if (!Number.isFinite(heightM)) {
        return false
      }

      const footprint = getState().footprints[footprintId]
      if (!footprint) {
        return false
      }

      const vertexCount = footprint.footprint.vertices.length
      if (edgeIndex < 0 || edgeIndex >= vertexCount) {
        return false
      }

      const start = edgeIndex
      const end = (edgeIndex + 1) % vertexCount
      let nextConstraints = setOrReplaceVertexConstraint(footprint.constraints.vertexHeights, {
        vertexIndex: start,
        heightM,
      })
      nextConstraints = setOrReplaceVertexConstraint(nextConstraints, {
        vertexIndex: end,
        heightM,
      })
      dispatch({
        type: 'SET_FOOTPRINT_VERTEX_HEIGHTS',
        payload: { footprintId, constraints: nextConstraints },
      })
      return true
    },
    setFootprintVertexHeights: (footprintId: string, constraints: VertexHeightConstraint[]) => {
      if (constraints.length === 0) {
        return false
      }

      const footprint = getState().footprints[footprintId]
      if (!footprint) {
        return false
      }

      const vertexCount = footprint.footprint.vertices.length
      const hasInvalidIndex = constraints.some(
        (constraint) => constraint.vertexIndex < 0 || constraint.vertexIndex >= vertexCount,
      )
      if (hasInvalidIndex) {
        return false
      }

      dispatch({
        type: 'SET_FOOTPRINT_VERTEX_HEIGHTS',
        payload: {
          footprintId,
          constraints: assertValidVertexHeights(constraints, vertexCount),
        },
      })
      return true
    },
    clearFootprintVertexHeight: (footprintId: string, vertexIndex: number) => {
      dispatch({ type: 'CLEAR_FOOTPRINT_VERTEX_HEIGHT', payload: { footprintId, vertexIndex } })
    },
    clearFootprintEdgeHeight: (footprintId: string, edgeIndex: number) => {
      dispatch({ type: 'CLEAR_FOOTPRINT_EDGE_HEIGHT', payload: { footprintId, edgeIndex } })
    },
    setFootprintKwp: (footprintId: string, kwp: number) => {
      if (!Number.isFinite(kwp)) {
        return false
      }
      dispatch({ type: 'SET_FOOTPRINT_KWP', payload: { footprintId, kwp } })
      return true
    },
    setFootprintPitchAdjustmentPercent: (footprintId: string, pitchAdjustmentPercent: number) => {
      if (!Number.isFinite(pitchAdjustmentPercent)) {
        return false
      }
      dispatch({
        type: 'SET_FOOTPRINT_PITCH_ADJUSTMENT_PERCENT',
        payload: { footprintId, pitchAdjustmentPercent },
      })
      return true
    },
    moveObstacleVertex: (obstacleId: string, vertexIndex: number, point: [number, number]) => {
      const obstacle = getState().obstacles[obstacleId]
      if (!obstacle || obstacle.shape.type !== 'polygon-prism') {
        return false
      }

      if (vertexIndex < 0 || vertexIndex >= obstacle.shape.polygon.length) {
        return false
      }

      dispatch({ type: 'MOVE_OBSTACLE_VERTEX', payload: { obstacleId, vertexIndex, point } })
      return true
    },
    setObstacleHeight: (obstacleId: string, heightAboveGroundM: number) => {
      if (!Number.isFinite(heightAboveGroundM)) {
        return false
      }
      dispatch({ type: 'SET_OBSTACLE_HEIGHT', payload: { obstacleId, heightAboveGroundM } })
      return true
    },
    setObstacleKind: (obstacleId: string, kind: ObstacleKind) => {
      dispatch({ type: 'SET_OBSTACLE_KIND', payload: { obstacleId, kind } })
      return true
    },
    setShadingGridResolutionM: (gridResolutionM: number) => {
      if (!Number.isFinite(gridResolutionM) || gridResolutionM <= 0) {
        return false
      }
      dispatch({ type: 'SET_SHADING_GRID_RESOLUTION', gridResolutionM })
      return true
    },
    upsertImportedFootprints: (entries: ImportedFootprintEntry[]) => {
      if (entries.length === 0) {
        return false
      }
      dispatch({ type: 'UPSERT_IMPORTED_FOOTPRINTS', entries })
      return true
    },
  }
}
