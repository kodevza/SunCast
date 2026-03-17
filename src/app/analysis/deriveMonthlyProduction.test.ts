import { describe, expect, it } from 'vitest'
import { deriveMonthlyProduction } from './deriveMonthlyProduction'
import type { SelectedRoofSunInput } from '../../types/presentation-contracts'

function createRoof(overrides: Partial<SelectedRoofSunInput> = {}): SelectedRoofSunInput {
  return {
    footprintId: 'roof-1',
    latDeg: 52.2297,
    lonDeg: 21.0122,
    kwp: 6000,
    roofPitchDeg: 35,
    roofAzimuthDeg: 180,
    roofPlane: { p: 0, q: 0, r: 12 },
    ...overrides,
  }
}

describe('deriveMonthlyProduction', () => {
  it('returns null when computation is disabled', () => {
    const result = deriveMonthlyProduction({
      year: 2026,
      timeZone: 'Europe/Warsaw',
      selectedRoofs: [createRoof()],
      computationEnabled: false,
    })

    expect(result).toBeNull()
  })

  it('aggregates selected roofs into monthly production totals', () => {
    const result = deriveMonthlyProduction({
      year: 2026,
      timeZone: 'Europe/Warsaw',
      selectedRoofs: [createRoof(), createRoof({ footprintId: 'roof-2', kwp: 3000 })],
    })

    expect(result).not.toBeNull()
    expect(result).toHaveLength(12)
    expect(result?.every((value) => Number.isFinite(value) && value >= 0)).toBe(true)
    expect(Math.max(...(result ?? [0]))).toBeGreaterThan(0)
  })

  it('returns null when selected roofs do not contribute usable production data', () => {
    const result = deriveMonthlyProduction({
      year: 2026,
      timeZone: 'Europe/Warsaw',
      selectedRoofs: [createRoof({ kwp: 0 })],
    })

    expect(result).toBeNull()
  })
})
