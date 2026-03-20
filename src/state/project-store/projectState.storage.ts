import type { ProjectData, ProjectSunProjectionSettings, ShadingSettings } from '../../types/geometry'
import { createAppError, err, ok, type AppError, type Result } from '../../shared/errors'
import { fromStoredFootprint, toStoredFootprint } from './projectState.mappers'
import { createProjectStoragePayload, migrateProjectStoragePayload } from './projectState.schema'
import type { ProjectState } from './projectState.types'

const STORAGE_KEY = 'suncast_project'
const LEGACY_DEFAULT_SHADING_GRID_RESOLUTION_M = 0.5
const CURRENT_DEFAULT_SHADING_GRID_RESOLUTION_M = 0.1
const GRID_RESOLUTION_EPS = 1e-9

function assertStoredObstacles(
  obstacles: ProjectData['obstacles'] | undefined,
): NonNullable<ProjectData['obstacles']> {
  if (!obstacles) {
    return {}
  }
  const entries = Object.values(obstacles)
  for (const obstacle of entries) {
    if (
      !obstacle ||
      typeof obstacle.id !== 'string' ||
      typeof obstacle.shape !== 'object' ||
      !Number.isFinite(obstacle.heightAboveGroundM)
    ) {
      throw new Error('Stored obstacle entry is invalid')
    }
  }

  return Object.fromEntries(entries.map((obstacle) => [obstacle.id, obstacle]))
}

export function readStorage(
  defaultSunProjection: ProjectSunProjectionSettings,
  defaultShadingSettings: ShadingSettings,
  defaultFootprintKwp: number,
  currentSolverConfigVersion: string,
): ProjectState | null {
  const result = readStorageResult(
    defaultSunProjection,
    defaultShadingSettings,
    defaultFootprintKwp,
    currentSolverConfigVersion,
  )
  return result.ok ? result.value : null
}

export function readStorageResult(
  defaultSunProjection: ProjectSunProjectionSettings,
  defaultShadingSettings: ShadingSettings,
  defaultFootprintKwp: number,
  currentSolverConfigVersion: string,
): Result<ProjectState | null, AppError> {
  void defaultFootprintKwp
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return ok(null)
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    const migrated = migrateProjectStoragePayload(parsed, currentSolverConfigVersion)
    if (!migrated) {
      return err(
        createAppError('STORAGE_CORRUPTED', 'Saved project payload is invalid.', {
          context: { area: 'project-storage', reason: 'migration-failed', enableStateReset: true },
        }),
      )
    }

    const entries = Object.values(migrated.footprints ?? {})
    const footprints = Object.fromEntries(
      entries.map((entry) => [entry.id, fromStoredFootprint(entry)]),
    )
    const obstacles = assertStoredObstacles(migrated.obstacles)
    const hasSolverConfigMismatch = migrated.solverConfigVersion !== currentSolverConfigVersion
    const persistedGridResolutionM = migrated.shadingSettings?.gridResolutionM
    const shouldUpgradeLegacyGridResolution =
      hasSolverConfigMismatch &&
      Number.isFinite(persistedGridResolutionM) &&
      Math.abs((persistedGridResolutionM ?? 0) - LEGACY_DEFAULT_SHADING_GRID_RESOLUTION_M) < GRID_RESOLUTION_EPS

    return ok({
      footprints,
      obstacles,
      sunProjection: {
        enabled: migrated.sunProjection?.enabled ?? defaultSunProjection.enabled,
        datetimeIso: migrated.sunProjection?.datetimeIso ?? defaultSunProjection.datetimeIso,
        dailyDateIso: migrated.sunProjection?.dailyDateIso ?? defaultSunProjection.dailyDateIso,
      },
      shadingSettings: {
        enabled: migrated.shadingSettings?.enabled ?? defaultShadingSettings.enabled,
        gridResolutionM: shouldUpgradeLegacyGridResolution
          ? CURRENT_DEFAULT_SHADING_GRID_RESOLUTION_M
          : (migrated.shadingSettings?.gridResolutionM ?? defaultShadingSettings.gridResolutionM),
      },
    })
  } catch (cause) {
    return err(
      createAppError('STORAGE_CORRUPTED', 'Saved project payload could not be parsed.', {
        cause,
        context: { area: 'project-storage', reason: 'json-parse-failed', enableStateReset: true },
      }),
    )
  }
}

export function writeStorage(
  state: Pick<
    ProjectState,
    'footprints' | 'obstacles' | 'sunProjection' | 'shadingSettings'
  >,
  currentSolverConfigVersion: string,
  defaultFootprintKwp: number,
): void {
  const footprints = Object.fromEntries(
    Object.entries(state.footprints).map(([id, entry]) => [id, toStoredFootprint(entry, defaultFootprintKwp)]),
  )

  const data: ProjectData = {
    footprints,
    obstacles: state.obstacles,
    solverConfigVersion: currentSolverConfigVersion,
    sunProjection: state.sunProjection,
    shadingSettings: state.shadingSettings,
  }

  const payload = createProjectStoragePayload(data, currentSolverConfigVersion)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}
