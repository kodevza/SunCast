import { describe, expect, it } from 'vitest'
import { planeSlopeFromPitchAzimuth } from './metrics'

describe('planeSlopeFromPitchAzimuth', () => {
  it('returns north-facing slope components for azimuth 0', () => {
    const slope = planeSlopeFromPitchAzimuth(30, 0)
    const tan30 = Math.tan((30 * Math.PI) / 180)
    expect(slope.p).toBeCloseTo(0, 10)
    expect(slope.q).toBeCloseTo(tan30, 10)
  })

  it('returns east-facing slope components for azimuth 90', () => {
    const slope = planeSlopeFromPitchAzimuth(45, 90)
    const tan45 = Math.tan((45 * Math.PI) / 180)
    expect(slope.p).toBeCloseTo(tan45, 10)
    expect(slope.q).toBeCloseTo(0, 10)
  })
})
