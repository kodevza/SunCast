import { describe, expect, it } from 'vitest'
import {
  firstDayOfYearIso,
  formatDateDdMm,
  formatDateIsoParts,
  formatDateIsoUtc,
  getDateIsosForRange,
  getDateIsosForYear,
  lastDayOfYearIso,
  parseDateDdMmInput,
  parseDateDdMmToIso,
  parseDateIsoUtc,
} from './dateIsoUtc'

describe('dateIsoUtc', () => {
  it('formats UTC date to ISO day string', () => {
    const date = new Date(Date.UTC(2026, 5, 7, 22, 30, 0))
    expect(formatDateIsoUtc(date)).toBe('2026-06-07')
  })

  it('formats and parses dd/mm date input with ISO helpers', () => {
    expect(formatDateIsoParts(2026, 6, 7)).toBe('2026-06-07')
    expect(formatDateDdMm('2026-06-07')).toBe('07/06')
    expect(parseDateDdMmInput(' 07/06/2026 ')).toEqual({ day: 7, month: 6, year: 2026 })
    expect(parseDateDdMmToIso('7/6', 2026)).toBe('2026-06-07')
    expect(parseDateDdMmToIso('31/02', 2026)).toBeNull()
  })

  it('parses valid date ISO into UTC timestamp', () => {
    expect(parseDateIsoUtc('2026-06-07')).toBe(Date.UTC(2026, 5, 7))
  })

  it('rejects malformed or invalid date ISO strings', () => {
    expect(parseDateIsoUtc('2026-6-7')).toBeNull()
    expect(parseDateIsoUtc('2026-02-30')).toBeNull()
    expect(parseDateIsoUtc('invalid')).toBeNull()
  })

  it('returns all ISO dates for a year with leap-year support', () => {
    const leap = getDateIsosForYear(2024)
    const regular = getDateIsosForYear(2025)

    expect(leap).toHaveLength(366)
    expect(leap[0]).toBe('2024-01-01')
    expect(leap[leap.length - 1]).toBe('2024-12-31')
    expect(regular).toHaveLength(365)
  })

  it('returns ISO dates for inclusive range and rejects invalid ranges', () => {
    expect(getDateIsosForRange('2026-06-01', '2026-06-03')).toEqual(['2026-06-01', '2026-06-02', '2026-06-03'])
    expect(getDateIsosForRange('2026-06-03', '2026-06-01')).toEqual([])
    expect(getDateIsosForRange('invalid', '2026-06-01')).toEqual([])
  })

  it('returns first and last day of year ISO', () => {
    expect(firstDayOfYearIso(2026)).toBe('2026-01-01')
    expect(lastDayOfYearIso(2026)).toBe('2026-12-31')
  })
})
