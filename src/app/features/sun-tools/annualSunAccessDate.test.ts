import { describe, expect, it } from 'vitest'
import { annualSunAccessSimulationYear, normalizeAnnualSunAccessDateRange } from './annualSunAccessDate'

describe('annualSunAccessDate', () => {
  it('normalizes wrapped annual date ranges across year-end', () => {
    expect(normalizeAnnualSunAccessDateRange('31/12', '01/01')).toEqual({
      dateStartIso: '2025-12-31',
      dateEndIso: '2026-01-01',
    })
    expect(normalizeAnnualSunAccessDateRange('01/02', '15/02')).toEqual({
      dateStartIso: '2026-02-01',
      dateEndIso: '2026-02-15',
    })
  })

  it('uses the fixed annual simulation year', () => {
    expect(annualSunAccessSimulationYear()).toBe(2026)
  })
})
