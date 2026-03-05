import { projectPointsToLocalMeters } from '../../geometry/projection/localMeters'
import type { RoofMeshData } from '../../types/geometry'

export interface WorldPoint {
  x: number
  y: number
  z: number
}

export interface RoofWorldMeshGeometry {
  triangleIndices: number[]
  topVertices: WorldPoint[]
  baseVertices: WorldPoint[]
  unitsPerMeter: number
}

const EARTH_CIRCUMFERENCE_M = 40075016.68557849
const DEG_TO_RAD = Math.PI / 180

function lonToMercatorX(lonDeg: number): number {
  return (lonDeg + 180) / 360
}

function latToMercatorY(latDeg: number): number {
  const latRad = latDeg * DEG_TO_RAD
  const mercN = Math.log(Math.tan(Math.PI * 0.25 + latRad * 0.5))
  return (1 - mercN / Math.PI) * 0.5
}

function meterInMercatorCoordinateUnits(latDeg: number): number {
  return 1 / (EARTH_CIRCUMFERENCE_M * Math.cos(latDeg * DEG_TO_RAD))
}

export function buildRoofWorldGeometry(mesh: RoofMeshData, zExaggeration = 1): RoofWorldMeshGeometry | null {
  if (mesh.vertices.length < 3) {
    return null
  }

  const lngLat = mesh.vertices.map((vertex) => [vertex.lon, vertex.lat] as [number, number])
  const { origin, points2d } = projectPointsToLocalMeters(lngLat)
  const originMercX = lonToMercatorX(origin.lon0)
  const originMercY = latToMercatorY(origin.lat0)
  const unitsPerMeter = meterInMercatorCoordinateUnits(origin.lat0)

  const topVertices: WorldPoint[] = []
  const baseVertices: WorldPoint[] = []

  for (let i = 0; i < mesh.vertices.length; i += 1) {
    const point2d = points2d[i]
    const z = mesh.vertices[i].z * zExaggeration
    const worldX = originMercX + point2d.x * unitsPerMeter
    const worldY = originMercY - point2d.y * unitsPerMeter
    topVertices.push({ x: worldX, y: worldY, z: z * unitsPerMeter })
    baseVertices.push({ x: worldX, y: worldY, z: 0 })
  }

  return {
    triangleIndices: mesh.triangleIndices,
    topVertices,
    baseVertices,
    unitsPerMeter,
  }
}
