import type { RoofMeshData, RoofMetrics, RoofPlane } from '../../types/geometry'
import { buildLocalOrigin, lonLatToLocalMeters } from '../projection/localMeters'

export function clampAzimuth(deg: number): number {
  let normalized = deg % 360
  if (normalized < 0) {
    normalized += 360
  }
  return normalized
}

export function planeSlopeFromPitchAzimuth(pitchDeg: number, azimuthDeg: number): { p: number; q: number } {
  const tanPitch = Math.tan((pitchDeg * Math.PI) / 180)
  const azimuthRad = (clampAzimuth(azimuthDeg) * Math.PI) / 180
  return {
    // x axis is east, y axis is north
    p: tanPitch * Math.sin(azimuthRad),
    q: tanPitch * Math.cos(azimuthRad),
  }
}

export function computeRoofMetrics(plane: RoofPlane, mesh: RoofMeshData): RoofMetrics {
  const slopeMagnitude = Math.sqrt(plane.p * plane.p + plane.q * plane.q)
  const pitchDeg = Math.atan(slopeMagnitude) * (180 / Math.PI)

  // p and q are dz/dx and dz/dy where x points east and y points north.
  const downslopeAzimuthDeg = clampAzimuth((Math.atan2(plane.p, plane.q) * 180) / Math.PI)

  const heights = mesh.vertices.map((v) => v.z)
  const minHeightM = Math.min(...heights)
  const maxHeightM = Math.max(...heights)

  const origin = buildLocalOrigin(mesh.vertices.map((v) => [v.lon, v.lat]))
  const points = mesh.vertices.map((v) => {
    const p2 = lonLatToLocalMeters(origin, [v.lon, v.lat])
    return { x: p2.x, y: p2.y, z: v.z }
  })

  let roofAreaM2 = 0
  for (let i = 0; i < mesh.triangleIndices.length; i += 3) {
    const a = points[mesh.triangleIndices[i]]
    const b = points[mesh.triangleIndices[i + 1]]
    const c = points[mesh.triangleIndices[i + 2]]

    const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }
    const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z }

    const cross = {
      x: ab.y * ac.z - ab.z * ac.y,
      y: ab.z * ac.x - ab.x * ac.z,
      z: ab.x * ac.y - ab.y * ac.x,
    }

    roofAreaM2 += 0.5 * Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z)
  }

  return {
    pitchDeg,
    azimuthDeg: downslopeAzimuthDeg,
    minHeightM,
    maxHeightM,
    roofAreaM2,
  }
}
