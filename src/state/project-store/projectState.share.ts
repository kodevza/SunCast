import type {
  ObstacleKind,
  ObstacleShape,
  ProjectSunProjectionSettings,
  ShadingSettings,
  StoredFootprint,
} from '../../types/geometry'
import { createAppError, err, ok, type AppError, type Result } from '../../shared/errors'
import { fromStoredFootprint } from './projectState.mappers'
import { validateLoadedState } from './projectState.sanitize'
import type { ProjectState } from './projectState.types'

const CURRENT_SHARE_SCHEMA_VERSION = 3

export interface SharedFootprintPayload {
  id: string
  polygon: Array<[number, number]>
  vertexHeights: Record<string, number>
  kwp: number
  pitchAdjustmentPercent?: number
}

export interface SharedProjectPayloadV1 {
  version: 1
  footprints: SharedFootprintPayload[]
  sunProjection?: {
    enabled: boolean
    datetimeIso: string | null
    dailyDateIso: string | null
    dateStartIso: string | null
    dateEndIso: string | null
  }
}

export interface SharedProjectPayloadV2 {
  schemaVersion: 2
  footprints: SharedFootprintPayload[]
  sunProjection?: {
    enabled: boolean
    datetimeIso: string | null
    dailyDateIso: string | null
    dateStartIso: string | null
    dateEndIso: string | null
  }
}

export interface SharedObstaclePayload {
  id: string
  kind: ObstacleKind
  shape: ObstacleShape
  heightAboveGroundM: number
  label?: string
}

export interface SharedProjectPayloadV3 {
  schemaVersion: 3
  footprints: SharedFootprintPayload[]
  obstacles: SharedObstaclePayload[]
  sunProjection?: {
    enabled: boolean
    datetimeIso: string | null
    dailyDateIso: string | null
    dateStartIso: string | null
    dateEndIso: string | null
  }
}

export type SharedProjectPayload = SharedProjectPayloadV3

function isLngLatPoint(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])
}

function isObstacleKind(value: unknown): value is ObstacleKind {
  return value === 'building' || value === 'tree' || value === 'pole' || value === 'custom'
}

function isObstacleShape(value: unknown): value is ObstacleShape {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false
  }

  if (value.type === 'polygon-prism') {
    if (!Array.isArray(value.polygon) || value.polygon.length < 3) {
      return false
    }
    return value.polygon.every((point) => isLngLatPoint(point))
  }

  if (value.type === 'cylinder') {
    return isLngLatPoint(value.center) && Number.isFinite(value.radiusM)
  }

  if (value.type === 'tree') {
    return (
      isLngLatPoint(value.center) && Number.isFinite(value.crownRadiusM) && Number.isFinite(value.trunkRadiusM)
    )
  }

  return false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function buildSharePayload(
  state: Pick<ProjectState, 'footprints' | 'obstacles' | 'sunProjection'>,
): SharedProjectPayload {
  return {
    schemaVersion: CURRENT_SHARE_SCHEMA_VERSION,
    footprints: Object.values(state.footprints).map((entry) => {
      const vertexHeights: Record<string, number> = {}
      for (const constraint of entry.constraints.vertexHeights) {
        vertexHeights[String(constraint.vertexIndex)] = constraint.heightM
      }

      return {
        id: entry.footprint.id,
        polygon: entry.footprint.vertices,
        vertexHeights,
        kwp: entry.footprint.kwp,
        pitchAdjustmentPercent: entry.pitchAdjustmentPercent,
      }
    }),
    obstacles: Object.values(state.obstacles),
    sunProjection: state.sunProjection,
  }
}

export function serializeSharePayload(payload: SharedProjectPayload): string {
  return JSON.stringify(payload)
}

function hasValidCommonShape(value: Record<string, unknown>): boolean {
  if (!Array.isArray(value.footprints)) {
    return false
  }

  if (value.obstacles !== undefined && !Array.isArray(value.obstacles)) {
    return false
  }

  if (value.sunProjection !== undefined) {
    const sunProjection = value.sunProjection
    if (!isRecord(sunProjection) || typeof sunProjection.enabled !== 'boolean') {
      return false
    }
    if (sunProjection.datetimeIso !== null && typeof sunProjection.datetimeIso !== 'string') {
      return false
    }
    if (sunProjection.dailyDateIso !== null && typeof sunProjection.dailyDateIso !== 'string') {
      return false
    }
    if (sunProjection.dateStartIso !== null && typeof sunProjection.dateStartIso !== 'string') {
      return false
    }
    if (sunProjection.dateEndIso !== null && typeof sunProjection.dateEndIso !== 'string') {
      return false
    }
    if (!Object.prototype.hasOwnProperty.call(sunProjection, 'dateStartIso')) {
      return false
    }
    if (!Object.prototype.hasOwnProperty.call(sunProjection, 'dateEndIso')) {
      return false
    }
  }

  for (const footprint of value.footprints) {
    if (!isRecord(footprint) || typeof footprint.id !== 'string') {
      return false
    }

    if (!Array.isArray(footprint.polygon) || footprint.polygon.length < 3) {
      return false
    }

    for (const point of footprint.polygon) {
      if (!Array.isArray(point) || point.length !== 2) {
        return false
      }
      if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
        return false
      }
    }

    if (!isRecord(footprint.vertexHeights)) {
      return false
    }

    for (const [indexRaw, heightM] of Object.entries(footprint.vertexHeights)) {
      if (!Number.isInteger(Number(indexRaw)) || !Number.isFinite(heightM)) {
        return false
      }
    }

    if (!Number.isFinite(footprint.kwp)) {
      return false
    }
    if (footprint.pitchAdjustmentPercent !== undefined && !Number.isFinite(footprint.pitchAdjustmentPercent)) {
      return false
    }
  }

  if (Array.isArray(value.obstacles)) {
    for (const obstacle of value.obstacles) {
      if (!isRecord(obstacle)) {
        return false
      }
      if (typeof obstacle.id !== 'string' || !isObstacleKind(obstacle.kind)) {
        return false
      }
      if (!isObstacleShape(obstacle.shape) || !Number.isFinite(obstacle.heightAboveGroundM)) {
        return false
      }
      if (obstacle.label !== undefined && typeof obstacle.label !== 'string') {
        return false
      }
    }
  }

  return true
}

function migrateSharePayload(value: unknown): SharedProjectPayloadV3 | null {
  if (!isRecord(value) || !hasValidCommonShape(value)) {
    return null
  }

  if (value.schemaVersion === CURRENT_SHARE_SCHEMA_VERSION) {
    return value as unknown as SharedProjectPayloadV3
  }

  if (value.schemaVersion === 2) {
    const v2 = value as unknown as SharedProjectPayloadV2
    return {
      schemaVersion: CURRENT_SHARE_SCHEMA_VERSION,
      footprints: v2.footprints,
      obstacles: [],
      sunProjection: v2.sunProjection,
    }
  }

  if (value.version === 1) {
    const legacy = value as unknown as SharedProjectPayloadV1
    return {
      schemaVersion: CURRENT_SHARE_SCHEMA_VERSION,
      footprints: legacy.footprints,
      obstacles: [],
      sunProjection: legacy.sunProjection,
    }
  }

  return null
}

export function validateSharePayload(value: unknown): value is SharedProjectPayload {
  return migrateSharePayload(value) !== null
}

export function deserializeSharePayload(
  raw: string,
  defaultSunProjection: ProjectSunProjectionSettings,
  defaultFootprintKwp: number,
  defaultShadingSettings: ShadingSettings,
): ProjectState {
  const result = deserializeSharePayloadResult(raw, defaultSunProjection, defaultFootprintKwp, defaultShadingSettings)
  if (!result.ok) {
    throw new Error(result.error.message)
  }
  return result.value
}

export function deserializeSharePayloadResult(
  raw: string,
  defaultSunProjection: ProjectSunProjectionSettings,
  defaultFootprintKwp: number,
  defaultShadingSettings: ShadingSettings,
): Result<ProjectState, AppError> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    return err(
      createAppError('SHARE_PAYLOAD_INVALID', 'Invalid share payload.', {
        cause,
        context: { area: 'share-payload', reason: 'json-parse-failed', enableStateReset: true },
      }),
    )
  }

  const migrated = migrateSharePayload(parsed)
  if (!migrated) {
    return err(
      createAppError('SHARE_PAYLOAD_INVALID', 'Invalid share payload.', {
        context: { area: 'share-payload', reason: 'schema-invalid', enableStateReset: true },
      }),
    )
  }

  let footprints: ProjectState['footprints']
  try {
    footprints = Object.fromEntries(
      migrated.footprints.map((footprint) => {
        const stored: StoredFootprint = {
          id: footprint.id,
          polygon: footprint.polygon,
          vertexHeights: footprint.vertexHeights,
          kwp: footprint.kwp,
          pitchAdjustmentPercent: footprint.pitchAdjustmentPercent,
        }
        return [footprint.id, fromStoredFootprint(stored)]
      }),
    )
  } catch (cause) {
    return err(
      createAppError('SHARE_PAYLOAD_INVALID', 'Invalid share payload.', {
        cause,
        context: { area: 'share-payload', reason: 'mapping-invalid', enableStateReset: true },
      }),
    )
  }

  const loaded: ProjectState = {
    footprints,
    obstacles: Object.fromEntries(migrated.obstacles.map((obstacle) => [obstacle.id, obstacle])),
    sunProjection: {
      enabled: migrated.sunProjection?.enabled ?? defaultSunProjection.enabled,
      datetimeIso: migrated.sunProjection?.datetimeIso ?? defaultSunProjection.datetimeIso,
      dailyDateIso: migrated.sunProjection?.dailyDateIso ?? defaultSunProjection.dailyDateIso,
      dateStartIso: migrated.sunProjection?.dateStartIso ?? defaultSunProjection.dateStartIso,
      dateEndIso: migrated.sunProjection?.dateEndIso ?? defaultSunProjection.dateEndIso,
    },
    shadingSettings: defaultShadingSettings,
  }

  try {
    return ok(validateLoadedState(loaded, defaultSunProjection, defaultFootprintKwp, defaultShadingSettings))
  } catch (cause) {
    return err(
      createAppError('SHARE_PAYLOAD_INVALID', 'Invalid share payload.', {
        cause,
        context: { area: 'share-payload', reason: 'state-invalid', enableStateReset: true },
      }),
    )
  }
}
