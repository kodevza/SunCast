import type {
  FootprintPolygon,
  LngLat,
  ObstacleKind,
  ObstacleShape,
  ObstacleStateEntry,
  ProjectSunProjectionSettings,
  ShadingSettings,
} from '../../types/geometry'
import { assertValidVertexHeights } from './projectState.constraints'
import type { FootprintStateEntry, ProjectState } from './projectState.types'

const MIN_PITCH_ADJUSTMENT_PERCENT = -90
const MAX_PITCH_ADJUSTMENT_PERCENT = 200

function isLngLat(value: unknown): value is LngLat {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  )
}

function assertPolygon(vertices: unknown, label: string): LngLat[] {
  if (!Array.isArray(vertices) || vertices.length < 3) {
    throw new Error(`${label} must contain at least 3 vertices`)
  }
  const normalized: LngLat[] = []
  for (let index = 0; index < vertices.length; index += 1) {
    const vertex = vertices[index]
    if (!isLngLat(vertex)) {
      throw new Error(`${label} contains invalid vertex at index ${index}`)
    }
    normalized.push([vertex[0], vertex[1]])
  }
  return normalized
}

function assertObstacleKind(kind: unknown): ObstacleKind {
  if (kind === 'building' || kind === 'tree' || kind === 'pole' || kind === 'custom') {
    return kind
  }
  throw new Error(`Unsupported obstacle kind: ${String(kind)}`)
}

function assertObstacleShape(shape: unknown, label: string): ObstacleShape {
  if (!shape || typeof shape !== 'object') {
    throw new Error(`${label} is missing shape`)
  }

  const shapeType = (shape as { type?: unknown }).type
  if (shapeType === 'polygon-prism') {
    return {
      type: 'polygon-prism',
      polygon: assertPolygon((shape as { polygon?: unknown }).polygon, `${label} polygon`),
    }
  }

  if (shapeType === 'cylinder') {
    const center = (shape as { center?: unknown }).center
    const radiusM = Number((shape as { radiusM?: unknown }).radiusM)
    if (!isLngLat(center) || !Number.isFinite(radiusM) || radiusM <= 0) {
      throw new Error(`${label} cylinder shape is invalid`)
    }
    return {
      type: 'cylinder',
      center: [center[0], center[1]],
      radiusM,
    }
  }

  if (shapeType === 'tree') {
    const center = (shape as { center?: unknown }).center
    const crownRadiusM = Number((shape as { crownRadiusM?: unknown }).crownRadiusM)
    const trunkRadiusM = Number((shape as { trunkRadiusM?: unknown }).trunkRadiusM)
    if (!isLngLat(center) || !Number.isFinite(crownRadiusM) || !Number.isFinite(trunkRadiusM) || crownRadiusM <= 0 || trunkRadiusM <= 0) {
      throw new Error(`${label} tree shape is invalid`)
    }
    return {
      type: 'tree',
      center: [center[0], center[1]],
      crownRadiusM,
      trunkRadiusM,
    }
  }

  throw new Error(`${label} shape type is invalid`)
}

function assertPitchAdjustmentPercent(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} pitch adjustment is invalid`)
  }
  if (value < MIN_PITCH_ADJUSTMENT_PERCENT || value > MAX_PITCH_ADJUSTMENT_PERCENT) {
    throw new Error(`${label} pitch adjustment ${value} is out of allowed range`)
  }
  return value
}

function assertFootprintEntry(
  footprintId: string,
  entry: FootprintStateEntry,
  defaultFootprintKwp: number,
): FootprintStateEntry {
  if (!entry.footprint || !Array.isArray(entry.footprint.vertices)) {
    throw new Error(`Footprint ${footprintId} is missing vertices`)
  }

  const id = typeof entry.footprint.id === 'string' && entry.footprint.id.length > 0 ? entry.footprint.id : footprintId
  const vertices = assertPolygon(entry.footprint.vertices, `Footprint ${id}`)
  const kwp = Number(entry.footprint.kwp)
  if (!Number.isFinite(kwp) || kwp < 0) {
    throw new Error(`Footprint ${id} has invalid kwp`)
  }

  const footprint: FootprintPolygon = {
    id,
    vertices,
    kwp: Number.isFinite(kwp) ? kwp : defaultFootprintKwp,
  }

  return {
    footprint,
    constraints: {
      vertexHeights: assertValidVertexHeights(entry.constraints.vertexHeights ?? [], footprint.vertices.length),
    },
    pitchAdjustmentPercent: assertPitchAdjustmentPercent(entry.pitchAdjustmentPercent, `Footprint ${id}`),
  }
}

function assertObstacleEntry(obstacleId: string, obstacle: ObstacleStateEntry): ObstacleStateEntry {
  const id = typeof obstacle.id === 'string' && obstacle.id.length > 0 ? obstacle.id : obstacleId
  const kind = assertObstacleKind(obstacle.kind)
  if (!Number.isFinite(obstacle.heightAboveGroundM) || obstacle.heightAboveGroundM < 0) {
    throw new Error(`Obstacle ${id} has invalid height`)
  }

  return {
    id,
    kind,
    shape: assertObstacleShape(obstacle.shape, `Obstacle ${id}`),
    heightAboveGroundM: obstacle.heightAboveGroundM,
    label: typeof obstacle.label === 'string' ? obstacle.label : undefined,
  }
}

function assertActiveIdExists(ids: Record<string, unknown>, activeId: string | null, label: string): string | null {
  if (activeId === null) {
    return null
  }
  if (!ids[activeId]) {
    throw new Error(`${label} ${activeId} does not exist`)
  }
  return activeId
}

function assertSelectedIdsExist(ids: Record<string, unknown>, selected: string[], label: string): string[] {
  for (const id of selected) {
    if (!ids[id]) {
      throw new Error(`${label} ${id} does not exist`)
    }
  }
  return [...selected]
}

export function validateLoadedState(
  state: ProjectState,
  defaultSunProjection: ProjectSunProjectionSettings,
  defaultFootprintKwp: number,
  defaultShadingSettings: ShadingSettings,
): ProjectState {
  const validated: Record<string, FootprintStateEntry> = {}
  for (const [footprintId, entry] of Object.entries(state.footprints)) {
    validated[footprintId] = assertFootprintEntry(footprintId, entry, defaultFootprintKwp)
  }

  const validatedObstacles: Record<string, ObstacleStateEntry> = {}
  for (const [obstacleId, obstacle] of Object.entries(state.obstacles ?? {})) {
    validatedObstacles[obstacleId] = assertObstacleEntry(obstacleId, obstacle)
  }

  const sunProjection = state.sunProjection ?? defaultSunProjection
  if (typeof sunProjection.enabled !== 'boolean') {
    throw new Error('Sun projection enabled flag is invalid')
  }
  if (sunProjection.datetimeIso !== null && typeof sunProjection.datetimeIso !== 'string') {
    throw new Error('Sun projection datetime is invalid')
  }
  if (sunProjection.dailyDateIso !== null && typeof sunProjection.dailyDateIso !== 'string') {
    throw new Error('Sun projection daily date is invalid')
  }

  const shadingSettings = state.shadingSettings ?? defaultShadingSettings
  if (typeof shadingSettings.enabled !== 'boolean') {
    throw new Error('Shading enabled flag is invalid')
  }
  if (!Number.isFinite(shadingSettings.gridResolutionM) || shadingSettings.gridResolutionM <= 0) {
    throw new Error('Shading grid resolution is invalid')
  }

  return {
    ...state,
    footprints: validated,
    selectedFootprintIds: assertSelectedIdsExist(validated, state.selectedFootprintIds, 'Selected footprint'),
    activeFootprintId: assertActiveIdExists(validated, state.activeFootprintId, 'Active footprint'),
    obstacles: validatedObstacles,
    selectedObstacleIds: assertSelectedIdsExist(validatedObstacles, state.selectedObstacleIds ?? [], 'Selected obstacle'),
    activeObstacleId: assertActiveIdExists(validatedObstacles, state.activeObstacleId, 'Active obstacle'),
    obstacleDrawDraft: [],
    isDrawingObstacle: false,
    sunProjection: {
      enabled: sunProjection.enabled,
      datetimeIso: sunProjection.datetimeIso,
      dailyDateIso: sunProjection.dailyDateIso,
    },
    shadingSettings: {
      enabled: shadingSettings.enabled,
      gridResolutionM: shadingSettings.gridResolutionM,
    },
  }
}
