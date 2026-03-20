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
  getSelectedFootprintIds,
  getSelectedObstacleEntries,
  isFootprintSelected,
} from '../editor-session/editorSession.selectors'
import { getObstacleEntries, getShadingReadyFootprintEntries } from '../../state/project-store/projectState.selectors'
import { toProjectDocumentState } from '../../state/project-store/projectDocument.types'
import { writeStorage } from '../../state/project-store/projectState.storage'
import type { Action } from '../../state/project-store/projectState.types'
import { createEditorSessionCommands } from '../editor-session/editorSession.commands'
import { editorSessionReducer } from '../editor-session/editorSession.reducer'
import type { EditorAction } from '../editor-session/editorSession.types'
import { initialEditorSessionState } from '../editor-session/editorSession.types'
import { createProjectStoreCommands } from './projectStore.commands'
import type { ProjectStoreAction, ProjectStoreState } from './projectStore.types'
import { useStartupHydration } from './useStartupHydration'

const SOLVER_CONFIG_VERSION = 'uc7'
const GEOMETRY_REVISION_ACTION_TYPES = new Set<Action['type']>([
  'ADD_FOOTPRINT',
  'DELETE_FOOTPRINT',
  'MOVE_FOOTPRINT_VERTEX',
  'MOVE_FOOTPRINT_EDGE',
  'SET_FOOTPRINT_VERTEX_HEIGHTS',
  'SET_FOOTPRINT_EDGE_HEIGHT',
  'CLEAR_FOOTPRINT_VERTEX_HEIGHT',
  'CLEAR_FOOTPRINT_EDGE_HEIGHT',
  'SET_FOOTPRINT_KWP',
  'SET_FOOTPRINT_PITCH_ADJUSTMENT_PERCENT',
  'ADD_OBSTACLE',
  'DELETE_OBSTACLE',
  'SET_OBSTACLE_HEIGHT',
  'SET_OBSTACLE_KIND',
  'MOVE_OBSTACLE_VERTEX',
  'UPSERT_IMPORTED_FOOTPRINTS',
  'LOAD',
  'RESET_STATE',
])

const initialProjectStoreState: ProjectStoreState = {
  ...initialProjectState,
  ...initialEditorSessionState,
}

const EDITOR_SESSION_ACTION_TYPES = new Set<ProjectStoreAction['type']>([
  'START_DRAW',
  'CANCEL_DRAW',
  'ADD_DRAFT_POINT',
  'UNDO_DRAFT_POINT',
  'SET_ACTIVE_FOOTPRINT',
  'SELECT_ONLY_FOOTPRINT',
  'TOGGLE_FOOTPRINT_SELECTION',
  'SELECT_ALL_FOOTPRINTS',
  'CLEAR_FOOTPRINT_SELECTION',
  'ADD_FOOTPRINT',
  'UPSERT_IMPORTED_FOOTPRINTS',
  'SET_ACTIVE_OBSTACLE',
  'CLEAR_OBSTACLE_SELECTION',
  'SELECT_ONLY_OBSTACLE',
  'TOGGLE_OBSTACLE_SELECTION',
  'START_OBSTACLE_DRAW',
  'CANCEL_OBSTACLE_DRAW',
  'ADD_OBSTACLE_DRAFT_POINT',
  'UNDO_OBSTACLE_DRAFT_POINT',
  'LOAD',
  'RESET_STATE',
])

function isEditorSessionAction(action: ProjectStoreAction): action is EditorAction {
  return EDITOR_SESSION_ACTION_TYPES.has(action.type as EditorAction['type'])
}

function reduceProjectStoreState(state: ProjectStoreState, action: ProjectStoreAction): ProjectStoreState {
  const projectState = projectStateReducer(state, action as Action) as ProjectStoreState
  const sessionState = isEditorSessionAction(action) ? editorSessionReducer(projectState, action) : projectState
  return {
    ...projectState,
    ...sessionState,
  }
}

export function useProjectStore() {
  const [state, dispatchRaw] = useReducer(reduceProjectStoreState, initialProjectStoreState)
  const [stateRevision, bumpStateRevision] = useReducer((revision: number) => revision + 1, 0)
  const [hasFinishedHydration, setHasFinishedHydration] = useState(false)
  const { footprints, obstacles, sunProjection, shadingSettings } = state
  const projectDocument = useMemo(
    () =>
      toProjectDocumentState({
        footprints,
        obstacles,
        sunProjection,
        shadingSettings,
      }),
    [footprints, obstacles, sunProjection, shadingSettings],
  )

  const dispatch = useCallback((action: ProjectStoreAction) => {
    dispatchRaw(action)
    if (GEOMETRY_REVISION_ACTION_TYPES.has(action.type as Action['type'])) {
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

    writeStorage(
      {
        footprints,
        obstacles,
        sunProjection,
        shadingSettings,
      },
      SOLVER_CONFIG_VERSION,
      DEFAULT_FOOTPRINT_KWP,
    )
  }, [hasFinishedHydration, footprints, obstacles, sunProjection, shadingSettings])

  return useMemo(() => {
    const activeFootprint = getActiveFootprint(state)
    const activeConstraints = getActiveConstraints(state)
    const selectedFootprintIds = getSelectedFootprintIds(state)
    const activeObstacle = getActiveObstacle(state)
    const selectedObstacleEntries = getSelectedObstacleEntries(state)
    const projectCommands = createProjectCommands(dispatch, () => state)
    const sessionCommands = createEditorSessionCommands(dispatch)
    const storeCommands = createProjectStoreCommands({
      dispatch,
      getState: () => state,
      projectCommands,
    })

    return {
      state,
      stateRevision,
      projectDocument,
      activeFootprint,
      activeConstraints,
      selectedFootprintIds,
      isFootprintSelected: (footprintId: string) => isFootprintSelected(selectedFootprintIds, footprintId),
      obstacles: getObstacleEntries(state),
      activeObstacle,
      selectedObstacles: selectedObstacleEntries,
      shadingReadyFootprints: getShadingReadyFootprintEntries(state),
      ...projectCommands,
      ...sessionCommands,
      ...storeCommands,
    }
  }, [dispatch, projectDocument, state, stateRevision])
}
