import { describe, expect, it } from 'vitest'
import { deriveAnnualDayProfile } from './deriveAnnualDayProfile'
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

describe('deriveAnnualDayProfile', () => {
  it('returns null when computation is disabled', () => {
    const result = deriveAnnualDayProfile({
      year: 2026,
      timeZone: 'Europe/Warsaw',
      selectedRoofs: [createRoof()],
      computationEnabled: false,
    })

    expect(result).toBeNull()
  })

  it('aggregates selected roofs into a weighted annual profile', () => {
    const result = deriveAnnualDayProfile({
      year: 2026,
      timeZone: 'Europe/Warsaw',
      selectedRoofs: [createRoof(), createRoof({ footprintId: 'roof-2', kwp: 3000 })],
    })

    expect(result).not.toBeNull()
    expect(result?.points.length).toBeGreaterThan(0)
    expect(result?.meta.stepMinutes).toBe(15)
    expect(result?.meta.dayCount).toBe(365)
    expect(result?.meta.nonZeroBuckets).toBe(result?.points.length)
    expect((result?.points[0]?.minuteOfDay ?? -1) % 15).toBe(0)
    expect(result?.points.every((point, index, points) => index === 0 || point.minuteOfDay >= points[index - 1].minuteOfDay)).toBe(true)

    const peakValue = Math.max(...(result?.points.map((point) => point.value) ?? [0]))
    expect(peakValue).toBeGreaterThan(0)
  })

  it('returns null when selected roofs do not contribute usable profile data', () => {
    const result = deriveAnnualDayProfile({
      year: 2026,
      timeZone: 'Europe/Warsaw',
      selectedRoofs: [createRoof({ kwp: 0 })],
    })

    expect(result).toBeNull()
  })
})
