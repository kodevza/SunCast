import type { FootprintPolygon, ObstacleStateEntry } from '../../types/geometry'
import { withMovedObstacleShapeVertex, withObstacleKind } from '../../geometry/obstacles/obstacleModels'
import { assertValidVertexHeights, setOrReplaceVertexConstraint } from './projectState.constraints'
import type { Action, ProjectState } from './projectState.types'

export const DEFAULT_FOOTPRINT_KWP = 4.3
export const DEFAULT_OBSTACLE_HEIGHT_M = 8

function applyToObstacle<T extends ProjectState>(
  state: T,
  obstacleId: string,
  updater: (entry: ObstacleStateEntry) => ObstacleStateEntry,
): T {
  const obstacle = state.obstacles[obstacleId]
  if (!obstacle) {
    return state
  }

  return {
    ...state,
    obstacles: {
      ...state.obstacles,
      [obstacleId]: updater(obstacle),
    },
  }
}

export function projectDocumentReducer<T extends ProjectState>(state: T, action: Action): T {
  switch (action.type) {
    case 'ADD_FOOTPRINT': {
      const footprint = action.payload.footprint
      return {
        ...state,
        footprints: {
          ...state.footprints,
          [footprint.id]: {
            footprint,
            constraints: { vertexHeights: [] },
            pitchAdjustmentPercent: 0,
          },
        },
      } as T
    }
    case 'DELETE_FOOTPRINT': {
      if (!state.footprints[action.footprintId]) {
        return state
      }

      const nextFootprints = { ...state.footprints }
      delete nextFootprints[action.footprintId]
      return {
        ...state,
        footprints: nextFootprints,
      } as T
    }
    case 'MOVE_FOOTPRINT_VERTEX': {
      const footprint = state.footprints[action.payload.footprintId]
      if (!footprint) {
        return state
      }

      const { vertexIndex, point } = action.payload
      const vertexCount = footprint.footprint.vertices.length
      if (vertexIndex < 0 || vertexIndex >= vertexCount) {
        return state
      }

      const nextVertices = [...footprint.footprint.vertices]
      nextVertices[vertexIndex] = point

      return {
        ...state,
        footprints: {
          ...state.footprints,
          [action.payload.footprintId]: {
            ...footprint,
            footprint: {
              ...footprint.footprint,
              vertices: nextVertices,
            },
          },
        },
      } as T
    }
    case 'MOVE_FOOTPRINT_EDGE': {
      const footprint = state.footprints[action.payload.footprintId]
      if (!footprint) {
        return state
      }

      const vertexCount = footprint.footprint.vertices.length
      const { edgeIndex, delta } = action.payload
      if (edgeIndex < 0 || edgeIndex >= vertexCount) {
        return state
      }

      const start = edgeIndex
      const end = (edgeIndex + 1) % vertexCount
      const nextVertices = [...footprint.footprint.vertices]
      const [deltaLon, deltaLat] = delta
      nextVertices[start] = [nextVertices[start][0] + deltaLon, nextVertices[start][1] + deltaLat]
      nextVertices[end] = [nextVertices[end][0] + deltaLon, nextVertices[end][1] + deltaLat]

      return {
        ...state,
        footprints: {
          ...state.footprints,
          [action.payload.footprintId]: {
            ...footprint,
            footprint: {
              ...footprint.footprint,
              vertices: nextVertices,
            },
          },
        },
      } as T
    }
    case 'SET_FOOTPRINT_VERTEX_HEIGHTS': {
      const footprint = state.footprints[action.payload.footprintId]
      if (!footprint) {
        return state
      }

      const vertexCount = footprint.footprint.vertices.length
      const nextVertexHeights = action.payload.constraints
      return {
        ...state,
        footprints: {
          ...state.footprints,
          [action.payload.footprintId]: {
            ...footprint,
            constraints: {
              ...footprint.constraints,
              vertexHeights: assertValidVertexHeights(nextVertexHeights, vertexCount),
            },
          },
        },
      } as T
    }
    case 'SET_FOOTPRINT_EDGE_HEIGHT': {
      const footprint = state.footprints[action.payload.footprintId]
      if (!footprint) {
        return state
      }

      const vertexCount = footprint.footprint.vertices.length
      if (action.payload.edgeIndex < 0 || action.payload.edgeIndex >= vertexCount) {
        return state
      }

      const start = action.payload.edgeIndex
      const end = (action.payload.edgeIndex + 1) % vertexCount
      let nextVertexHeights = setOrReplaceVertexConstraint(footprint.constraints.vertexHeights, {
        vertexIndex: start,
        heightM: action.payload.heightM,
      })
      nextVertexHeights = setOrReplaceVertexConstraint(nextVertexHeights, {
        vertexIndex: end,
        heightM: action.payload.heightM,
      })

      return {
        ...state,
        footprints: {
          ...state.footprints,
          [action.payload.footprintId]: {
            ...footprint,
            constraints: {
              ...footprint.constraints,
              vertexHeights: assertValidVertexHeights(nextVertexHeights, vertexCount),
            },
          },
        },
      } as T
    }
    case 'SET_FOOTPRINT_KWP': {
      const footprint = state.footprints[action.payload.footprintId]
      if (!footprint) {
        return state
      }

      return {
        ...state,
        footprints: {
          ...state.footprints,
          [action.payload.footprintId]: {
            ...footprint,
            footprint: {
              ...footprint.footprint,
              kwp: action.payload.kwp,
            },
          },
        },
      } as T
    }
    case 'SET_FOOTPRINT_PITCH_ADJUSTMENT_PERCENT': {
      const footprint = state.footprints[action.payload.footprintId]
      if (!footprint) {
        return state
      }

      return {
        ...state,
        footprints: {
          ...state.footprints,
          [action.payload.footprintId]: {
            ...footprint,
            pitchAdjustmentPercent: action.payload.pitchAdjustmentPercent,
          },
        },
      } as T
    }
    case 'CLEAR_FOOTPRINT_VERTEX_HEIGHT': {
      const footprint = state.footprints[action.payload.footprintId]
      if (!footprint) {
        return state
      }

      return {
        ...state,
        footprints: {
          ...state.footprints,
          [action.payload.footprintId]: {
            ...footprint,
            constraints: {
              ...footprint.constraints,
              vertexHeights: footprint.constraints.vertexHeights.filter(
                (c) => c.vertexIndex !== action.payload.vertexIndex,
              ),
            },
          },
        },
      } as T
    }
    case 'CLEAR_FOOTPRINT_EDGE_HEIGHT': {
      const footprint = state.footprints[action.payload.footprintId]
      if (!footprint) {
        return state
      }

      const vertexCount = footprint.footprint.vertices.length
      if (action.payload.edgeIndex < 0 || action.payload.edgeIndex >= vertexCount) {
        return state
      }

      const start = action.payload.edgeIndex
      const end = (action.payload.edgeIndex + 1) % vertexCount

      return {
        ...state,
        footprints: {
          ...state.footprints,
          [action.payload.footprintId]: {
            ...footprint,
            constraints: {
              ...footprint.constraints,
              vertexHeights: footprint.constraints.vertexHeights.filter(
                (c) => c.vertexIndex !== start && c.vertexIndex !== end,
              ),
            },
          },
        },
      } as T
    }
    case 'SET_SUN_PROJECTION_ENABLED':
      return {
        ...state,
        sunProjection: {
          ...state.sunProjection,
          enabled: action.enabled,
        },
      } as T
    case 'SET_SUN_PROJECTION_DATETIME':
      return {
        ...state,
        sunProjection: {
          ...state.sunProjection,
          datetimeIso: action.datetimeIso,
        },
      } as T
    case 'SET_SUN_PROJECTION_DAILY_DATE':
      return {
        ...state,
        sunProjection: {
          ...state.sunProjection,
          dailyDateIso: action.dailyDateIso,
        },
      } as T
    case 'SET_SUN_PROJECTION_DATE_START':
      return {
        ...state,
        sunProjection: {
          ...state.sunProjection,
          dateStartIso: action.dateStartIso,
        },
      } as T
    case 'SET_SUN_PROJECTION_DATE_END':
      return {
        ...state,
        sunProjection: {
          ...state.sunProjection,
          dateEndIso: action.dateEndIso,
        },
      } as T
    case 'ADD_OBSTACLE': {
      const {obstacle} = action.payload

      return {
        ...state,
        obstacles: {
          ...state.obstacles,
          [obstacle.id]: obstacle,
        },
      } as T
    }
    case 'DELETE_OBSTACLE': {
      if (!state.obstacles[action.obstacleId]) {
        return state
      }

      const nextObstacles = { ...state.obstacles }
      delete nextObstacles[action.obstacleId]
      return {
        ...state,
        obstacles: nextObstacles,
      } as T
    }
    case 'SET_OBSTACLE_HEIGHT':
      return applyToObstacle(state, action.payload.obstacleId, (entry) => ({
        ...entry,
        heightAboveGroundM: action.payload.heightAboveGroundM,
      })) as T
    case 'SET_OBSTACLE_KIND':
      return applyToObstacle(state, action.payload.obstacleId, (entry) => withObstacleKind(entry, action.payload.kind)) as T
    case 'MOVE_OBSTACLE_VERTEX':
      return applyToObstacle(state, action.payload.obstacleId, (entry) =>
        withMovedObstacleShapeVertex(entry, action.payload.vertexIndex, action.payload.point),
      ) as T
    case 'SET_SHADING_ENABLED':
      return {
        ...state,
        shadingSettings: {
          ...state.shadingSettings,
          enabled: action.enabled,
        },
      } as T
    case 'SET_SHADING_GRID_RESOLUTION':
      return {
        ...state,
        shadingSettings: {
          ...state.shadingSettings,
          gridResolutionM: action.gridResolutionM,
        },
      } as T
    case 'UPSERT_IMPORTED_FOOTPRINTS': {
      if (action.entries.length === 0) {
        return state
      }

      const nextFootprints = { ...state.footprints }
      for (const entry of action.entries) {
        const footprint: FootprintPolygon = {
          id: entry.footprintId,
          vertices: entry.polygon,
          kwp: state.footprints[entry.footprintId]?.footprint.kwp ?? DEFAULT_FOOTPRINT_KWP,
        }
        nextFootprints[entry.footprintId] = {
          footprint,
          constraints: {
            vertexHeights: assertValidVertexHeights(entry.vertexHeights, footprint.vertices.length),
          },
          pitchAdjustmentPercent: state.footprints[entry.footprintId]?.pitchAdjustmentPercent ?? 0,
        }
      }

      return {
        ...state,
        footprints: nextFootprints,
      } as T
    }
    default:
      return state
  }
}
