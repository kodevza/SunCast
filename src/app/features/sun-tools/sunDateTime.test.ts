import { describe, expect, it } from 'vitest'
import { parseIsoDateTimeWithTimezone } from '../../../geometry/sun/sunPosition'
import { extractDateIsoInTimeZone, extractYearInTimeZone, formatIsoDateTimeWithLocalOffset } from './sunDateTime'

describe('sunDateTime', () => {
  it('extracts zoned date from timezone-aware datetime', () => {
    expect(extractDateIsoInTimeZone('2026-03-07T23:30:00Z', 'UTC')).toBe('2026-03-07')
    expect(extractDateIsoInTimeZone('2026-03-07T23:30:00Z', 'Europe/Warsaw')).toBe('2026-03-08')
  })

  it('rejects datetime without timezone', () => {
    expect(extractDateIsoInTimeZone('2026-03-07T23:30:00', 'Europe/Warsaw')).toBeNull()
    expect(extractYearInTimeZone('2026-03-07T23:30:00', 'Europe/Warsaw')).toBeNull()
  })

  it('extracts year from selected timezone date', () => {
    expect(extractYearInTimeZone('2026-12-31T23:30:00-02:00', 'Europe/Warsaw')).toBe(2027)
  })

  it('formats current local datetime with explicit offset', () => {
    const iso = formatIsoDateTimeWithLocalOffset(new Date(2026, 2, 7, 12, 34, 56))
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/)
    expect(parseIsoDateTimeWithTimezone(iso)).not.toBeNull()
  })
})

