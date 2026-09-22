import { describe, expect, it } from 'vitest'
import { deriveAnnualDayProfile, deriveDailyProductionProfile, deriveMonthlyProduction } from './modelled'
import type { SelectedRoofSunInput } from '../../types/presentation-contracts'

const roof: SelectedRoofSunInput = {
  footprintId: 'roof-1', latDeg: 52.2297, lonDeg: 21.0122, kwp: 6000,
  roofPitchDeg: 35, roofAzimuthDeg: 180, roofPlane: { p: 0, q: 0, r: 12 },
}

describe('core modelled production', () => {
  it('derives a daily profile only for active positive-capacity roofs', () => {
    expect(deriveDailyProductionProfile({ dateIso: '2026-06-21', timeZone: 'Europe/Warsaw', selectedRoofs: [roof] })?.productionValues_kW.some((value) => value > 0)).toBe(true)
    expect(deriveDailyProductionProfile({ dateIso: '2026-06-21', timeZone: 'Europe/Warsaw', selectedRoofs: [{ ...roof, kwp: 0 }] })).toBeNull()
  })

  it('aggregates modelled monthly output across roofs', () => {
    const result = deriveMonthlyProduction({ year: 2026, timeZone: 'Europe/Warsaw', selectedRoofs: [roof, { ...roof, footprintId: 'roof-2', kwp: 3000 }] })
    expect(result).toHaveLength(12)
    expect(result?.every((value) => Number.isFinite(value) && value >= 0)).toBe(true)
  })

  it('returns a sampled annual profile with explicit sampling metadata', () => {
    const result = deriveAnnualDayProfile({ year: 2026, timeZone: 'Europe/Warsaw', selectedRoofs: [roof] })
    expect(result?.points.length).toBeGreaterThan(0)
    expect(result?.meta.dayCount).toBe(365)
  })
})
