import type { FaceConstraints, FootprintPolygon, ObstacleStateEntry } from '../../types/geometry'
import {
  getFootprintEntryById,
  getObstacleEntriesByIds,
  getObstacleEntryById,
} from '../../state/project-store/projectState.selectors'
import type { ProjectStoreState } from '../project-store/projectStore.types'

const EMPTY_CONSTRAINTS: FaceConstraints = { vertexHeights: [] }

export function getActiveFootprint(state: ProjectStoreState): FootprintPolygon | null {
  const activeFootprint = getFootprintEntryById(state, state.activeFootprintId)
  if (!activeFootprint) {
    return null
  }

  return activeFootprint.footprint
}

export function getActiveConstraints(state: ProjectStoreState): FaceConstraints {
  const activeFootprint = getFootprintEntryById(state, state.activeFootprintId)
  if (!activeFootprint) {
    return EMPTY_CONSTRAINTS
  }

  return activeFootprint.constraints
}

export function getSelectedFootprintIds(state: ProjectStoreState): string[] {
  return [...state.selectedFootprintIds]
}

export function isFootprintSelected(selectedFootprintIds: string[], footprintId: string): boolean {
  return selectedFootprintIds.includes(footprintId)
}

export function getActiveObstacle(state: ProjectStoreState): ObstacleStateEntry | null {
  return getObstacleEntryById(state, state.activeObstacleId)
}

export function getSelectedObstacleEntries(state: ProjectStoreState): ObstacleStateEntry[] {
  return getObstacleEntriesByIds(state, state.selectedObstacleIds)
}
