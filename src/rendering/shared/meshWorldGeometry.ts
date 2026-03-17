import type { RoofMeshData } from '../../types/geometry'

export interface WorldPoint {
  x: number
  y: number
  z: number
}

export interface WorldMeshGeometry {
  triangleIndices: number[]
  topVertices: WorldPoint[]
  baseVertices: WorldPoint[]
  anchorX: number
  anchorY: number
  unitsPerMeter: number
}

const EARTH_CIRCUMFERENCE_M = 40075016.68557849
const DEG_TO_RAD = Math.PI / 180



export function lonToMercatorX(lonDeg: number): number {
  return (lonDeg + 180) / 360
}



export function latToMercatorY(latDeg: number): number {
  const latRad = latDeg * DEG_TO_RAD
  const mercN = Math.log(Math.tan(Math.PI * 0.25 + latRad * 0.5))
  return (1 - mercN / Math.PI) * 0.5
}



function meterInMercatorCoordinateUnits(latDeg: number): number {
  return 1 / (EARTH_CIRCUMFERENCE_M * Math.cos(latDeg * DEG_TO_RAD))
}



export function buildWorldMeshGeometry(mesh: RoofMeshData, zExaggeration = 1): WorldMeshGeometry | null {
  if (mesh.vertices.length < 3) {
    return null
  }

  let anchorXSum = 0
  let anchorYSum = 0
  for (const vertex of mesh.vertices) {
    anchorXSum += lonToMercatorX(vertex.lon)
    anchorYSum += latToMercatorY(vertex.lat)
  }
  const anchorX = anchorXSum / mesh.vertices.length
  const anchorY = anchorYSum / mesh.vertices.length

  const topVertices: WorldPoint[] = []
  const baseVertices: WorldPoint[] = []
  let unitsPerMeterSum = 0

  for (let i = 0; i < mesh.vertices.length; i += 1) {
    const vertex = mesh.vertices[i]
    const unitsPerMeterAtVertex = meterInMercatorCoordinateUnits(vertex.lat)
    const worldX = lonToMercatorX(vertex.lon)
    const worldY = latToMercatorY(vertex.lat)
    const topZ = vertex.z * zExaggeration * unitsPerMeterAtVertex
    topVertices.push({ x: worldX - anchorX, y: worldY - anchorY, z: topZ })
    baseVertices.push({ x: worldX - anchorX, y: worldY - anchorY, z: 0 })
    unitsPerMeterSum += unitsPerMeterAtVertex
  }

  const unitsPerMeter = unitsPerMeterSum / mesh.vertices.length

  return {
    triangleIndices: mesh.triangleIndices,
    topVertices,
    baseVertices,
    anchorX,
    anchorY,
    unitsPerMeter,
  }
}
