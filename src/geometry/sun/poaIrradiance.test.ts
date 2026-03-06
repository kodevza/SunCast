import { describe, expect, it } from 'vitest'
import { computePOA } from './poaIrradiance'

describe('computePOA', () => {
  it('returns zero at night', () => {
    const result = computePOA({
      dni_Wm2: 700,
      dhi_Wm2: 80,
      tiltDeg: 20,
      incidenceDeg: 30,
      sunElevationDeg: 0,
    })

    expect(result.poaIrradiance_Wm2).toBe(0)
    expect(result.poaDirect_Wm2).toBe(0)
    expect(result.poaDiffuse_Wm2).toBe(0)
  })

  it('has near-zero direct component at 90 degree incidence', () => {
    const result = computePOA({
      dni_Wm2: 900,
      dhi_Wm2: 100,
      tiltDeg: 25,
      incidenceDeg: 90,
      sunElevationDeg: 35,
    })

    expect(result.poaDirect_Wm2).toBeCloseTo(0, 8)
    expect(result.poaDiffuse_Wm2).toBeGreaterThan(0)
  })

  it('changes monotonically with pitch for a fixed sun position and azimuth alignment', () => {
    const base = {
      dni_Wm2: 850,
      dhi_Wm2: 90,
      sunElevationDeg: 30,
    }

    const flat = computePOA({ ...base, tiltDeg: 0, incidenceDeg: 60 })
    const medium = computePOA({ ...base, tiltDeg: 20, incidenceDeg: 40 })
    const steep = computePOA({ ...base, tiltDeg: 40, incidenceDeg: 20 })

    expect(medium.poaIrradiance_Wm2).toBeGreaterThan(flat.poaIrradiance_Wm2)
    expect(steep.poaIrradiance_Wm2).toBeGreaterThan(medium.poaIrradiance_Wm2)
  })
})
