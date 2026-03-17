import { describe, expect, it } from 'vitest'
import {
  firstDayOfYearIso,
  formatDateIso,
  formatDateIsoEu,
  lastDayOfYearIso,
  parseDateEuToIso,
} from './annualSunAccessDate'

describe('annualSunAccessDate', () => {
  it('formats ISO date parts', () => {
    expect(formatDateIso(2026, 3, 7)).toBe('2026-03-07')
  })

  it('formats ISO date as EU string', () => {
    expect(formatDateIsoEu('2026-03-07')).toBe('07.03.2026')
    expect(formatDateIsoEu('not-a-date')).toBe('not-a-date')
  })

  it('parses EU date into validated ISO date', () => {
    expect(parseDateEuToIso('7.3.2026')).toBe('2026-03-07')
    expect(parseDateEuToIso(' 07.03.2026 ')).toBe('2026-03-07')
    expect(parseDateEuToIso('31.02.2026')).toBeNull()
    expect(parseDateEuToIso('invalid')).toBeNull()
  })

  it('returns first and last day of year ISO', () => {
    expect(firstDayOfYearIso(2026)).toBe('2026-01-01')
    expect(lastDayOfYearIso(2026)).toBe('2026-12-31')
  })
})
