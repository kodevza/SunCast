import earcut from 'earcut'
import type { FootprintPolygon, RoofMeshData } from '../../types/geometry'
import { projectPointsToLocalMeters } from '../projection/localMeters'

const EDGE_LENGTH_EPSILON_M = 0.005
const TRIANGLE_AREA_EPSILON_M2 = 1e-5

interface MeshVertex {
  lon: number
  lat: number
  z: number
}

interface Point2 {
  x: number
  y: number
}

function distance2d(a: Point2, b: Point2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

function triangleArea2d(a: Point2, b: Point2, c: Point2): number {
  return Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) * 0.5
}

function assertValidFootprintVertices(
  footprint: FootprintPolygon,
  vertexHeightsM: number[],
): { vertices: MeshVertex[]; points2d: Point2[] } {
  if (footprint.vertices.length !== vertexHeightsM.length) {
    throw new Error('Footprint vertices and roof vertex heights must have equal length')
  }
  if (footprint.vertices.length < 3) {
    throw new Error('Footprint must contain at least 3 vertices')
  }

  const { points2d } = projectPointsToLocalMeters(footprint.vertices)
  for (let i = 0; i < points2d.length; i += 1) {
    const a = points2d[i]
    const b = points2d[(i + 1) % points2d.length]
    if (distance2d(a, b) < EDGE_LENGTH_EPSILON_M) {
      throw new Error('Footprint contains near-zero edge length and cannot be triangulated')
    }
  }

  const vertices = footprint.vertices.map(([lon, lat], index) => ({
    lon,
    lat,
    z: vertexHeightsM[index],
  }))

  return {
    vertices,
    points2d,
  }
}

function assertNonDegenerateTriangles(points2d: Point2[], triangleIndices: number[]): void {
  if (triangleIndices.length === 0 || triangleIndices.length % 3 !== 0) {
    throw new Error('Roof triangulation returned invalid topology')
  }

  for (let i = 0; i < triangleIndices.length; i += 3) {
    const ia = triangleIndices[i]
    const ib = triangleIndices[i + 1]
    const ic = triangleIndices[i + 2]
    const a = points2d[ia]
    const b = points2d[ib]
    const c = points2d[ic]
    if (!a || !b || !c) {
      throw new Error('Roof triangulation references invalid vertex index')
    }
    if (triangleArea2d(a, b, c) < TRIANGLE_AREA_EPSILON_M2) {
      throw new Error('Roof triangulation produced degenerate triangle')
    }
  }
}

export function generateRoofMesh(footprint: FootprintPolygon, vertexHeightsM: number[]): RoofMeshData {
  const { vertices, points2d } = assertValidFootprintVertices(footprint, vertexHeightsM)

  const flatCoords = points2d.flatMap((point) => [point.x, point.y])
  const indices = earcut(flatCoords)
  assertNonDegenerateTriangles(points2d, indices)

  return {
    vertices,
    triangleIndices: indices,
  }
}
