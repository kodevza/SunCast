import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { createProjectCommands } from '../../state/project-store/projectState.commands'
import {
  DEFAULT_FOOTPRINT_KWP,
  initialProjectState,
  projectStateReducer,
} from '../../state/project-store/projectState.reducer'
import {
  getActiveConstraints,
  getActiveFootprint,
  getActiveObstacle,
  getObstacleEntries,
  getSelectedFootprintIds,
  getSelectedObstacleEntries,
  getShadingReadyFootprintEntries,
  isFootprintSelected,
} from '../../state/project-store/projectState.selectors'
import { writeStorage } from '../../state/project-store/projectState.storage'
import type { Action, ProjectState } from '../../state/project-store/projectState.types'
import { editorSessionReducer } from '../editor-session/editorSession.reducer'
import { useStartupHydration } from './useStartupHydration'

const SOLVER_CONFIG_VERSION = 'uc7'
const GEOMETRY_REVISION_ACTION_TYPES = new Set<Action['type']>([
  'COMMIT_FOOTPRINT',
  'DELETE_FOOTPRINT',
  'MOVE_VERTEX',
  'MOVE_EDGE',
  'SET_VERTEX_HEIGHT',
  'SET_VERTEX_HEIGHTS',
  'SET_EDGE_HEIGHT',
  'CLEAR_VERTEX_HEIGHT',
  'CLEAR_EDGE_HEIGHT',
  'COMMIT_OBSTACLE',
  'DELETE_OBSTACLE',
  'SET_OBSTACLE_HEIGHT',
  'SET_OBSTACLE_KIND',
  'MOVE_OBSTACLE_VERTEX',
  'UPSERT_IMPORTED_FOOTPRINTS',
  'LOAD',
  'RESET_STATE',
])

function reduceProjectStoreState(state: ProjectState, action: Action): ProjectState {
  return editorSessionReducer(projectStateReducer(state, action), action)
}

export function useProjectStore() {
  const [state, dispatchRaw] = useReducer(reduceProjectStoreState, initialProjectState)
  const [stateRevision, bumpStateRevision] = useReducer((revision: number) => revision + 1, 0)
  const [hasFinishedHydration, setHasFinishedHydration] = useState(false)

  const dispatch = useCallback((action: Action) => {
    dispatchRaw(action)
    if (GEOMETRY_REVISION_ACTION_TYPES.has(action.type)) {
      bumpStateRevision()
    }
  }, [])
  const markHydrationFinished = useCallback(() => {
    setHasFinishedHydration(true)
  }, [])

  useStartupHydration({
    dispatch,
    markHydrationFinished,
    solverConfigVersion: SOLVER_CONFIG_VERSION,
  })

  useEffect(() => {
    if (!hasFinishedHydration) {
      return
    }

    const projectDocument = {
      footprints: state.footprints,
      obstacles: state.obstacles,
      sunProjection: state.sunProjection,
      shadingSettings: state.shadingSettings,
    }

    writeStorage(
      {
        ...projectDocument,
        // Active ids belong to editor session; keep persisted payload canonical.
        activeFootprintId: null,
        activeObstacleId: null,
      },
      SOLVER_CONFIG_VERSION,
      DEFAULT_FOOTPRINT_KWP,
    )
  }, [
    hasFinishedHydration,
    state.footprints,
    state.obstacles,
    state.sunProjection,
    state.shadingSettings,
  ])

  return useMemo(() => {
    const activeFootprint = getActiveFootprint(state)
    const projectDocument = {
      footprints: state.footprints,
      obstacles: state.obstacles,
      sunProjection: state.sunProjection,
      shadingSettings: state.shadingSettings,
    }
    const editorSession = {
      activeFootprintId: state.activeFootprintId,
      selectedFootprintIds: state.selectedFootprintIds,
      drawDraft: state.drawDraft,
      isDrawing: state.isDrawing,
      activeObstacleId: state.activeObstacleId,
      selectedObstacleIds: state.selectedObstacleIds,
      obstacleDrawDraft: state.obstacleDrawDraft,
      isDrawingObstacle: state.isDrawingObstacle,
    }

    return {
      state,
      stateRevision,
      projectDocument,
      editorSession,
      activeFootprint,
      activeConstraints: getActiveConstraints(state),
      selectedFootprintIds: getSelectedFootprintIds(state),
      isFootprintSelected: (footprintId: string) => isFootprintSelected(state, footprintId),
      obstacles: getObstacleEntries(state),
      activeObstacle: getActiveObstacle(state),
      selectedObstacles: getSelectedObstacleEntries(state),
      shadingReadyFootprints: getShadingReadyFootprintEntries(state),
      sunProjection: state.sunProjection,
      shadingSettings: state.shadingSettings,
      ...createProjectCommands(dispatch, () => state),
    }
  }, [dispatch, state, stateRevision])
}
