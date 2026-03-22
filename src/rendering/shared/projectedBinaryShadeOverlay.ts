import earcut from 'earcut'
import type { ComputeRoofShadeGridResult } from '../../geometry/shading'
import type { LngLat, RoofMeshData } from '../../types/geometry'
import { buildWorldMeshGeometry, latToMercatorY, lonToMercatorX, type WorldMeshGeometry, type WorldPoint } from './meshWorldGeometry'

const BARYCENTRIC_TOLERANCE = 1e-6
const BARYCENTRIC_DEGENERATE_RELATIVE_EPSILON = 1e-8
const SHADE_RENDER_EPSILON_M = 0.0025

export interface ProjectedBinaryShadeCell {
  roofId: string
  cellPolygon: LngLat[]
}

export interface ProjectedBinaryShadeOverlayGeometry {
  anchorX: number
  anchorY: number
  positions: Float32Array
  indices: Uint32Array
}

interface WorldTriangle {
  a: WorldPoint
  b: WorldPoint
  c: WorldPoint
}

interface IndexedRoofGeometry {
  roofId: string | null
  world: WorldMeshGeometry
  triangles: WorldTriangle[]
  bbox: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
}

function removeClosingPoint(ring: LngLat[]): LngLat[] {
  if (ring.length < 2) {
    return ring
  }

  const [firstLon, firstLat] = ring[0]
  const [lastLon, lastLat] = ring[ring.length - 1]
  if (firstLon === lastLon && firstLat === lastLat) {
    return ring.slice(0, -1)
  }
  return ring
}

function barycentricWeights(
  x: number,
  y: number,
  a: WorldPoint,
  b: WorldPoint,
  c: WorldPoint,
): [number, number, number] | null {
  const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y)
  const edgeCAx = a.x - c.x
  const edgeCAy = a.y - c.y
  const edgeCBx = b.x - c.x
  const edgeCBy = b.y - c.y
  const denominatorScale = edgeCAx * edgeCAx + edgeCAy * edgeCAy + edgeCBx * edgeCBx + edgeCBy * edgeCBy
  if (denominatorScale <= 0 || Math.abs(denominator) <= BARYCENTRIC_DEGENERATE_RELATIVE_EPSILON * denominatorScale) {
    return null
  }

  const weightA = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / denominator
  const weightB = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / denominator
  const weightC = 1 - weightA - weightB
  if (
    weightA < -BARYCENTRIC_TOLERANCE ||
    weightB < -BARYCENTRIC_TOLERANCE ||
    weightC < -BARYCENTRIC_TOLERANCE
  ) {
    return null
  }

  return [weightA, weightB, weightC]
}

function toWorldPoint(geometry: WorldMeshGeometry, point: WorldPoint): WorldPoint {
  return {
    x: point.x + geometry.anchorX,
    y: point.y + geometry.anchorY,
    z: point.z,
  }
}

function triangleList(world: WorldMeshGeometry): WorldTriangle[] {
  const triangles: WorldTriangle[] = []

  for (let i = 0; i < world.triangleIndices.length; i += 3) {
    const ia = world.triangleIndices[i]
    const ib = world.triangleIndices[i + 1]
    const ic = world.triangleIndices[i + 2]
    if (ia === undefined || ib === undefined || ic === undefined) {
      continue
    }

    const a = world.topVertices[ia]
    const b = world.topVertices[ib]
    const c = world.topVertices[ic]
    if (!a || !b || !c) {
      continue
    }

    triangles.push({
      a: toWorldPoint(world, a),
      b: toWorldPoint(world, b),
      c: toWorldPoint(world, c),
    })
  }

  return triangles
}

function worldBoundingBox(world: WorldMeshGeometry): IndexedRoofGeometry['bbox'] {
  let minX = (world.topVertices[0]?.x ?? 0) + world.anchorX
  let minY = (world.topVertices[0]?.y ?? 0) + world.anchorY
  let maxX = (world.topVertices[0]?.x ?? 0) + world.anchorX
  let maxY = (world.topVertices[0]?.y ?? 0) + world.anchorY

  for (const vertex of world.topVertices) {
    const worldX = vertex.x + world.anchorX
    const worldY = vertex.y + world.anchorY
    minX = Math.min(minX, worldX)
    minY = Math.min(minY, worldY)
    maxX = Math.max(maxX, worldX)
    maxY = Math.max(maxY, worldY)
  }

  return { minX, minY, maxX, maxY }
}

function pointInsideBbox(x: number, y: number, bbox: IndexedRoofGeometry['bbox']): boolean {
  return x >= bbox.minX && x <= bbox.maxX && y >= bbox.minY && y <= bbox.maxY
}

function interpolateRoofZ(roof: IndexedRoofGeometry, x: number, y: number): number | null {
  for (const triangle of roof.triangles) {
    const weights = barycentricWeights(x, y, triangle.a, triangle.b, triangle.c)
    if (!weights) {
      continue
    }

    const [wa, wb, wc] = weights
    return wa * triangle.a.z + wb * triangle.b.z + wc * triangle.c.z
  }
  return null
}

function toIndexedRoofs(meshes: RoofMeshData[], zExaggeration: number): IndexedRoofGeometry[] {
  const result: IndexedRoofGeometry[] = []

  for (const roof of meshes) {
    const world = buildWorldMeshGeometry(roof, zExaggeration)
    if (!world) {
      continue
    }

    const triangles = triangleList(world)
    if (triangles.length === 0) {
      continue
    }

    result.push({
      roofId: roof.id ?? null,
      world,
      triangles,
      bbox: worldBoundingBox(world),
    })
  }

  return result
}

function resolveRoofForCell(cellPolygon: LngLat[], roofId: string | null, roofs: IndexedRoofGeometry[]): IndexedRoofGeometry | null {
  const ring = removeClosingPoint(cellPolygon)
  if (ring.length === 0) {
    return null
  }

  const [lon, lat] = ring[0]
  const x = lonToMercatorX(lon)
  const y = latToMercatorY(lat)
  const candidates = roofId === null ? [] : roofs.filter((roof) => roof.roofId === roofId)
  const roofsToCheck = candidates.length > 0 ? candidates : roofs

  for (const roof of roofsToCheck) {
    if (!pointInsideBbox(x, y, roof.bbox)) {
      continue
    }
    if (interpolateRoofZ(roof, x, y) !== null) {
      return roof
    }
  }

  return null
}

export function buildProjectedBinaryShadeOverlayGeometry(
  roofMeshes: RoofMeshData[],
  shadeResult: ComputeRoofShadeGridResult | null,
  zExaggeration: number,
): ProjectedBinaryShadeOverlayGeometry | null {
  if (!shadeResult || shadeResult.status !== 'OK' || roofMeshes.length === 0) {
    return null
  }

  const roofs = toIndexedRoofs(roofMeshes, zExaggeration)
  if (roofs.length === 0) {
    return null
  }

  const positions: number[] = []
  const indices: number[] = []
  let anchorX = 0
  let anchorY = 0
  let hasAnchor = false

  for (const roof of shadeResult.roofs) {
    const pointCount = roof.cellPolygonPointCount
    if (pointCount <= 0 || roof.shadeFactors.length === 0) {
      continue
    }

    const coordinateStride = pointCount * 2
    for (let cellIndex = 0; cellIndex < roof.shadeFactors.length; cellIndex += 1) {
      if (roof.shadeFactors[cellIndex] <= 0) {
        continue
      }

      const cellPolygon: LngLat[] = new Array(pointCount)
      const cellOffset = cellIndex * coordinateStride
      for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
        const coordOffset = cellOffset + pointIndex * 2
        cellPolygon[pointIndex] = [
          roof.cellPolygonLonLat[coordOffset],
          roof.cellPolygonLonLat[coordOffset + 1],
        ]
      }

      const ring = removeClosingPoint(cellPolygon)
      if (ring.length < 3) {
        continue
      }

      const roofGeometry = resolveRoofForCell(cellPolygon, roof.roofId, roofs)
      if (!roofGeometry) {
        continue
      }

      const projectedVertices: Array<{ x: number; y: number; z: number }> = []
      for (const [lon, lat] of ring) {
        const worldX = lonToMercatorX(lon)
        const worldY = latToMercatorY(lat)
        const worldZ = interpolateRoofZ(roofGeometry, worldX, worldY)
        if (worldZ === null) {
          projectedVertices.length = 0
          break
        }

        projectedVertices.push({
          x: worldX,
          y: worldY,
          z: worldZ,
        })
      }

      if (projectedVertices.length < 3) {
        continue
      }

      const flatCoords = projectedVertices.flatMap((vertex) => [vertex.x, vertex.y])
      const polygonIndices = earcut(flatCoords)
      if (polygonIndices.length < 3) {
        continue
      }

      const startIndex = positions.length / 3
      const zLift = SHADE_RENDER_EPSILON_M * roofGeometry.world.unitsPerMeter

      if (!hasAnchor) {
        anchorX = projectedVertices[0].x
        anchorY = projectedVertices[0].y
        hasAnchor = true
      }

      for (const vertex of projectedVertices) {
        positions.push(vertex.x - anchorX, vertex.y - anchorY, vertex.z + zLift)
      }

      for (const polygonIndex of polygonIndices) {
        indices.push(startIndex + polygonIndex)
      }
    }
  }

  if (positions.length === 0 || indices.length === 0) {
    return null
  }

  return {
    anchorX,
    anchorY,
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  }
}

export function buildProjectedBinaryShadeOverlayGeometryFromCells(
  roofMeshes: RoofMeshData[],
  cells: ProjectedBinaryShadeCell[],
  zExaggeration: number,
): ProjectedBinaryShadeOverlayGeometry | null {
  if (roofMeshes.length === 0 || cells.length === 0) {
    return null
  }

  const roofs = toIndexedRoofs(roofMeshes, zExaggeration)
  if (roofs.length === 0) {
    return null
  }

  const positions: number[] = []
  const indices: number[] = []
  let anchorX = 0
  let anchorY = 0
  let hasAnchor = false

  for (const cell of cells) {
    const ring = removeClosingPoint(cell.cellPolygon)
    if (ring.length < 3) {
      continue
    }

    const roof = resolveRoofForCell(cell.cellPolygon, cell.roofId, roofs)
    if (!roof) {
      continue
    }

    const projectedVertices: Array<{ x: number; y: number; z: number }> = []
    for (const [lon, lat] of ring) {
      const worldX = lonToMercatorX(lon)
      const worldY = latToMercatorY(lat)
      const worldZ = interpolateRoofZ(roof, worldX, worldY)
      if (worldZ === null) {
        projectedVertices.length = 0
        break
      }

      projectedVertices.push({
        x: worldX,
        y: worldY,
        z: worldZ,
      })
    }

    if (projectedVertices.length < 3) {
      continue
    }

    const flatCoords = projectedVertices.flatMap((vertex) => [vertex.x, vertex.y])
    const polygonIndices = earcut(flatCoords)
    if (polygonIndices.length < 3) {
      continue
    }

    const startIndex = positions.length / 3
    const zLift = SHADE_RENDER_EPSILON_M * roof.world.unitsPerMeter

    if (!hasAnchor) {
      anchorX = projectedVertices[0].x
      anchorY = projectedVertices[0].y
      hasAnchor = true
    }

    for (const vertex of projectedVertices) {
      positions.push(vertex.x - anchorX, vertex.y - anchorY, vertex.z + zLift)
    }

    for (const polygonIndex of polygonIndices) {
      indices.push(startIndex + polygonIndex)
    }
  }

  if (positions.length === 0 || indices.length === 0) {
    return null
  }

  return {
    anchorX,
    anchorY,
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  }
}
