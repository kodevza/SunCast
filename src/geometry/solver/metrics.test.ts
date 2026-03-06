import { describe, expect, it } from 'vitest'
import { computeRoofMetrics, planeSlopeFromPitchAzimuth } from './metrics'
import type { RoofMeshData } from '../../types/geometry'

describe('planeSlopeFromPitchAzimuth', () => {
  it('returns north-facing downslope components for azimuth 0', () => {
    const slope = planeSlopeFromPitchAzimuth(30, 0)
    const tan30 = Math.tan((30 * Math.PI) / 180)
    expect(slope.p).toBeCloseTo(0, 10)
    expect(slope.q).toBeCloseTo(-tan30, 10)
  })

  it('returns east-facing downslope components for azimuth 90', () => {
    const slope = planeSlopeFromPitchAzimuth(45, 90)
    const tan45 = Math.tan((45 * Math.PI) / 180)
    expect(slope.p).toBeCloseTo(-tan45, 10)
    expect(slope.q).toBeCloseTo(0, 10)
  })
})

describe('computeRoofMetrics', () => {
  const mesh: RoofMeshData = {
    vertices: [
      { lon: 21.0, lat: 52.0, z: 0 },
      { lon: 21.0001, lat: 52.0, z: 0 },
      { lon: 21.0001, lat: 52.0001, z: 0 },
      { lon: 21.0, lat: 52.0001, z: 0 },
    ],
    triangleIndices: [0, 1, 2, 0, 2, 3],
  }

  it('computes 45deg pitch for unit east slope (Pythagoras check)', () => {
    const metrics = computeRoofMetrics({ p: 1, q: 0, r: 0 }, mesh)
    expect(metrics.pitchDeg).toBeCloseTo(45, 10)
    expect(metrics.azimuthDeg).toBeCloseTo(270, 10)
  })

  it('computes pitch from sqrt(p^2+q^2)', () => {
    const metrics = computeRoofMetrics({ p: 3, q: 4, r: 0 }, mesh)
    const expected = Math.atan(Math.sqrt(3 * 3 + 4 * 4)) * (180 / Math.PI)
    expect(metrics.pitchDeg).toBeCloseTo(expected, 10)
  })
})
