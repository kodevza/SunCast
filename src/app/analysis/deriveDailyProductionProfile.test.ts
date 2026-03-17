import { describe, expect, it } from 'vitest'
import { deriveDailyProductionProfile } from './deriveDailyProductionProfile'
import type { RoofPlane } from '../../types/geometry'

function createRoof(overrides: Partial<{ footprintId: string; latDeg: number; lonDeg: number; kwp: number; roofPlane: RoofPlane }> = {}) {
  return {
    footprintId: 'roof-1',
    latDeg: 52.2297,
    lonDeg: 21.0122,
    kwp: 6000,
    roofPlane: { p: 0.2, q: -0.1, r: 12 },
    ...overrides,
  }
}

describe('deriveDailyProductionProfile', () => {
  it('returns null when computation is disabled', () => {
    const result = deriveDailyProductionProfile({
      dateIso: '2026-06-21',
      timeZone: 'Europe/Warsaw',
      selectedRoofs: [createRoof()],
      computationEnabled: false,
    })

    expect(result).toBeNull()
  })

  it('aggregates selected roofs into a daily production profile', () => {
    const result = deriveDailyProductionProfile({
      dateIso: '2026-06-21',
      timeZone: 'Europe/Warsaw',
      selectedRoofs: [createRoof(), createRoof({ footprintId: 'roof-2', kwp: 3000 })],
    })

    expect(result).not.toBeNull()
    expect(result?.labels.length).toBeGreaterThan(0)
    expect(result?.labels.length).toBe(result?.productionValues_kW.length)
    expect(result?.productionValues_kW.every((value) => Number.isFinite(value) && value >= 0)).toBe(true)
    expect(result?.peakProductionValue_kW).toBeGreaterThan(0)
    if (result?.sunriseTs && result?.sunsetTs) {
      expect(result.sunriseTs).toBeLessThan(result.sunsetTs)
    }
    expect(result?.peakProductionTimeLabel).toMatch(/^\d{2}:\d{2}$/)
  })

  it('returns null when selected roofs do not contribute usable production data', () => {
    const result = deriveDailyProductionProfile({
      dateIso: '2026-06-21',
      timeZone: 'Europe/Warsaw',
      selectedRoofs: [createRoof({ kwp: 0 })],
    })

    expect(result).toBeNull()
  })
})
