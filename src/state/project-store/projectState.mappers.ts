import type { FootprintPolygon, StoredFootprint } from '../../types/geometry'
import { assertValidVertexHeights } from './projectState.constraints'
import type { FootprintStateEntry } from './projectState.types'

export function fromStoredFootprint(stored: StoredFootprint): FootprintStateEntry {
  if (typeof stored.id !== 'string' || stored.id.length === 0) {
    throw new Error('Stored footprint id is invalid')
  }
  if (!Array.isArray(stored.polygon) || stored.polygon.length < 3) {
    throw new Error(`Stored footprint ${stored.id} has invalid polygon`)
  }
  for (const [index, vertex] of stored.polygon.entries()) {
    if (!Array.isArray(vertex) || vertex.length !== 2 || !Number.isFinite(vertex[0]) || !Number.isFinite(vertex[1])) {
      throw new Error(`Stored footprint ${stored.id} has invalid vertex at index ${index}`)
    }
  }

  const kwp = Number(stored.kwp)
  if (!Number.isFinite(kwp) || kwp < 0) {
    throw new Error(`Stored footprint ${stored.id} has invalid kwp`)
  }

  const footprint: FootprintPolygon = {
    id: stored.id,
    vertices: stored.polygon,
    kwp,
  }

  const vertexHeights = Object.entries(stored.vertexHeights)
    .map(([vertexIndexRaw, heightM]) => ({
      vertexIndex: Number(vertexIndexRaw),
      heightM,
    }))

  const pitchAdjustmentPercent = Number(stored.pitchAdjustmentPercent)
  if (!Number.isFinite(pitchAdjustmentPercent)) {
    throw new Error(`Stored footprint ${stored.id} has invalid pitch adjustment`)
  }

  return {
    footprint,
    constraints: {
      vertexHeights: assertValidVertexHeights(vertexHeights, footprint.vertices.length),
    },
    pitchAdjustmentPercent,
  }
}

export function toStoredFootprint(entry: FootprintStateEntry, defaultFootprintKwp: number): StoredFootprint {
  const vertexHeights: Record<string, number> = {}
  for (const constraint of entry.constraints.vertexHeights) {
    vertexHeights[String(constraint.vertexIndex)] = constraint.heightM
  }

  return {
    id: entry.footprint.id,
    polygon: entry.footprint.vertices,
    vertexHeights,
    kwp: Number.isFinite(entry.footprint.kwp) ? Math.max(0, entry.footprint.kwp) : defaultFootprintKwp,
    pitchAdjustmentPercent: entry.pitchAdjustmentPercent,
  }
}
