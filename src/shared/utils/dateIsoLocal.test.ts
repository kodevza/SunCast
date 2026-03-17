import { describe, expect, it } from 'vitest'
import {
  dateIsoInTimeZone,
  formatDateIsoLocal,
  formatTimestampHHmmInTimeZone,
  getZonedDateParts,
  getZonedDateTimeParts,
  localDateTimeInTimeZoneToUtcTs,
} from './dateIsoLocal'

describe('dateIsoLocal', () => {
  it('formats local date to ISO', () => {
    const date = new Date(2026, 2, 7, 11, 30, 0)
    expect(formatDateIsoLocal(date)).toBe('2026-03-07')
  })

  it('extracts zoned date parts and date iso', () => {
    const ts = Date.UTC(2026, 2, 7, 23, 30, 0)
    expect(getZonedDateParts(ts, 'UTC')).toEqual({ year: 2026, month: 3, day: 7 })
    expect(dateIsoInTimeZone(ts, 'Europe/Warsaw')).toBe('2026-03-08')
  })

  it('extracts zoned date-time parts', () => {
    const ts = Date.UTC(2026, 2, 7, 23, 30, 45)
    expect(getZonedDateTimeParts(ts, 'UTC')).toEqual({
      year: 2026,
      month: 3,
      day: 7,
      hour: 23,
      minute: 30,
      second: 45,
    })
  })

  it('formats timestamp as HH:mm in timezone', () => {
    const ts = Date.UTC(2026, 2, 7, 23, 30, 0)
    expect(formatTimestampHHmmInTimeZone(ts, 'UTC')).toBe('23:30')
  })

  it('converts local date-time in timezone to UTC timestamp', () => {
    const utcTs = localDateTimeInTimeZoneToUtcTs(
      { year: 2026, month: 6, day: 21, hour: 12, minute: 0, second: 0 },
      'Europe/Warsaw',
    )
    expect(new Date(utcTs).toISOString()).toBe('2026-06-21T10:00:00.000Z')
  })
})
