import type { Dispatch } from 'react'
import type { FootprintPolygon, ObstacleStateEntry } from '../../types/geometry'
import type { ProjectCommands } from '../../state/project-store/projectState.commands'
import type { ProjectStoreAction, ProjectStoreState } from './projectStore.types'

function generateFootprintId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `fp-${crypto.randomUUID()}`
  }
  return `fp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function createFootprintFromDraft(draft: Array<[number, number]>): FootprintPolygon {
  return {
    id: generateFootprintId(),
    vertices: draft,
    kwp: 4.3,
  }
}

function generateObstacleId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `ob-${crypto.randomUUID()}`
  }
  return `ob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function createObstacleFromDraft(draft: Array<[number, number]>): ObstacleStateEntry {
  return {
    id: generateObstacleId(),
    kind: 'custom',
    shape: {
      type: 'polygon-prism',
      polygon: draft,
    },
    heightAboveGroundM: 8,
  }
}

export interface ProjectStoreCommands {
  commitFootprint: () => void
  commitObstacle: () => void
  setActiveFootprintKwp: (kwp: number) => boolean
  setActivePitchAdjustmentPercent: (pitchAdjustmentPercent: number) => boolean
}

interface CreateProjectStoreCommandsArgs {
  dispatch: Dispatch<ProjectStoreAction>
  getState: () => ProjectStoreState
  projectCommands: ProjectCommands
}

export function createProjectStoreCommands({
  dispatch,
  getState,
  projectCommands,
}: CreateProjectStoreCommandsArgs): ProjectStoreCommands {
  return {
    commitFootprint: () => {
      const { drawDraft } = getState()
      if (drawDraft.length < 3) {
        return
      }

      const footprint = createFootprintFromDraft(drawDraft)
      projectCommands.addFootprint(footprint)
      dispatch({ type: 'SELECT_ONLY_FOOTPRINT', footprintId: footprint.id })
    },
    commitObstacle: () => {
      const { obstacleDrawDraft } = getState()
      if (obstacleDrawDraft.length < 3) {
        return
      }

      const obstacle = createObstacleFromDraft(obstacleDrawDraft)
      projectCommands.addObstacle(obstacle)
      dispatch({ type: 'SELECT_ONLY_OBSTACLE', obstacleId: obstacle.id })
    },
    setActiveFootprintKwp: (kwp: number) => {
      const activeFootprintId = getState().activeFootprintId
      if (!activeFootprintId) {
        return false
      }
      return projectCommands.setFootprintKwp(activeFootprintId, kwp)
    },
    setActivePitchAdjustmentPercent: (pitchAdjustmentPercent: number) => {
      const activeFootprintId = getState().activeFootprintId
      if (!activeFootprintId) {
        return false
      }
      return projectCommands.setFootprintPitchAdjustmentPercent(activeFootprintId, pitchAdjustmentPercent)
    },
  }
}
