import { describe, expect, it } from 'vitest'
import { computeSunProjection } from './sunProjection'

describe('computeSunProjection', () => {
  it('returns POA exactly zero when sun is below horizon', () => {
    const result = computeSunProjection({
      datetimeIso: '2026-12-21T01:00:00-05:00',
      latDeg: 40.7128,
      lonDeg: -74.006,
      plane: { p: 0.1, q: 0.2, r: 1 },
    })

    expect(result.sunElevationDeg).toBeLessThanOrEqual(0)
    expect(result.poaIrradiance_Wm2).toBe(0)
    expect(result.poaDirect_Wm2).toBe(0)
    expect(result.poaDiffuse_Wm2).toBe(0)
  })
})
