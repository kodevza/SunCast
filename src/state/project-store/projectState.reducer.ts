import type { ProjectSunProjectionSettings, ShadingSettings } from '../../types/geometry'
import { validateLoadedState } from './projectState.sanitize'
import type { Action, ProjectState } from './projectState.types'
import {
  DEFAULT_FOOTPRINT_KWP,
  projectDocumentReducer,
} from './projectDocument.reducer'

export { DEFAULT_FOOTPRINT_KWP }

export const DEFAULT_SUN_PROJECTION: ProjectSunProjectionSettings = {
  enabled: true,
  datetimeIso: null,
  dailyDateIso: null,
  dateStartIso: null,
  dateEndIso: null,
}

export const DEFAULT_SHADING_SETTINGS: ShadingSettings = {
  enabled: true,
  gridResolutionM: 0.1,
}

export const initialProjectState: ProjectState = {
  footprints: {},
  obstacles: {},
  sunProjection: DEFAULT_SUN_PROJECTION,
  shadingSettings: DEFAULT_SHADING_SETTINGS,
}

export function projectStateReducer<T extends ProjectState>(state: T, action: Action): T {
  if (action.type === 'LOAD') {
    return {
      ...state,
      ...validateLoadedState(action.payload, DEFAULT_SUN_PROJECTION, DEFAULT_FOOTPRINT_KWP, DEFAULT_SHADING_SETTINGS),
    } as T
  }

  if (action.type === 'RESET_STATE') {
    return {
      ...state,
      ...initialProjectState,
      sunProjection: { ...DEFAULT_SUN_PROJECTION },
      shadingSettings: { ...DEFAULT_SHADING_SETTINGS },
    } as T
  }

  return projectDocumentReducer(state, action)
}
