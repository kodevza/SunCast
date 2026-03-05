import type { RoofMeshData } from '../../types/geometry'
import { buildRoofWorldGeometry } from './roofWorldGeometry'

const OVERLAY_Z_EPSILON_M = 0.08

export interface DebugOverlayGeometry {
  loopsPerMesh: number[]
  loopCoords: number[]
  stemCoords: number[]
  fillCoords: number[]
  loopVertexCount: number
  stemVertexCount: number
  fillVertexCount: number
}

function isDegenerateTopLoop(vertices: Array<{ x: number; y: number }>): boolean {
  if (vertices.length < 3) {
    return true
  }

  let minX = vertices[0].x
  let maxX = vertices[0].x
  let minY = vertices[0].y
  let maxY = vertices[0].y
  let twiceArea = 0

  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i]
    const b = vertices[(i + 1) % vertices.length]
    twiceArea += a.x * b.y - b.x * a.y
    minX = Math.min(minX, a.x)
    maxX = Math.max(maxX, a.x)
    minY = Math.min(minY, a.y)
    maxY = Math.max(maxY, a.y)
  }

  const bboxArea = (maxX - minX) * (maxY - minY)
  if (!Number.isFinite(bboxArea) || bboxArea <= 0) {
    return true
  }

  const areaEpsilon = Math.max(1e-20, bboxArea * 1e-6)
  return Math.abs(twiceArea) * 0.5 <= areaEpsilon
}

export function buildDebugOverlayGeometry(meshes: RoofMeshData[], zExaggeration: number): DebugOverlayGeometry {
  const loopsPerMesh: number[] = []
  const loopCoords: number[] = []
  const stemCoords: number[] = []
  const fillCoords: number[] = []

  for (const mesh of meshes) {
    const world = buildRoofWorldGeometry(mesh, zExaggeration)
    if (!world || world.topVertices.length < 3) {
      continue
    }

    const zEpsilon = OVERLAY_Z_EPSILON_M * world.unitsPerMeter
    const topVertices = world.topVertices.map((vertex) => ({ ...vertex, z: vertex.z + zEpsilon }))
    if (isDegenerateTopLoop(topVertices)) {
      continue
    }
    loopsPerMesh.push(topVertices.length)

    for (let i = 0; i < topVertices.length; i += 1) {
      const top = topVertices[i]
      const base = world.baseVertices[i]
      loopCoords.push(top.x, top.y, top.z)
      stemCoords.push(top.x, top.y, top.z)
      stemCoords.push(base.x, base.y, base.z)
    }

    for (let i = 0; i < world.triangleIndices.length; i += 3) {
      const idxA = world.triangleIndices[i]
      const idxB = world.triangleIndices[i + 1]
      const idxC = world.triangleIndices[i + 2]
      if (idxA === undefined || idxB === undefined || idxC === undefined) {
        continue
      }
      const a = topVertices[idxA]
      const b = topVertices[idxB]
      const c = topVertices[idxC]
      if (!a || !b || !c) {
        continue
      }
      fillCoords.push(a.x, a.y, a.z)
      fillCoords.push(b.x, b.y, b.z)
      fillCoords.push(c.x, c.y, c.z)
    }
  }

  return {
    loopsPerMesh,
    loopCoords,
    stemCoords,
    fillCoords,
    loopVertexCount: loopCoords.length / 3,
    stemVertexCount: stemCoords.length / 3,
    fillVertexCount: fillCoords.length / 3,
  }
}
