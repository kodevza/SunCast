import type { ObstacleStateEntry } from '../../types/geometry'
import type { FootprintStateEntry, ProjectState } from './projectState.types'

export function getFootprintEntries(state: ProjectState): FootprintStateEntry[] {
  return Object.values(state.footprints)
}

export function getFootprintEntryById(state: ProjectState, footprintId: string | null): FootprintStateEntry | null {
  if (!footprintId) {
    return null
  }

  return state.footprints[footprintId] ?? null
}

export function getShadingReadyFootprintEntries(state: ProjectState): FootprintStateEntry[] {
  return getFootprintEntries(state)
}

export function getObstacleEntries(state: ProjectState): ObstacleStateEntry[] {
  return Object.values(state.obstacles)
}

export function getObstacleEntryById(state: ProjectState, obstacleId: string | null): ObstacleStateEntry | null {
  if (!obstacleId) {
    return null
  }

  return state.obstacles[obstacleId] ?? null
}

export function getObstacleEntriesByIds(state: ProjectState, obstacleIds: string[]): ObstacleStateEntry[] {
  return obstacleIds
    .map((id) => state.obstacles[id])
    .filter((entry): entry is ObstacleStateEntry => Boolean(entry))
}
