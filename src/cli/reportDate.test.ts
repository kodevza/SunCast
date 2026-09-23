import { describe, expect, it } from 'vitest'
import { resolveReportDateIso } from './reportDate'

describe('resolveReportDateIso', () => {
  const now = new Date('2026-09-23T15:30:00.000Z')

  it('uses today in the local timezone when the command does not provide --date', () => {
    expect(resolveReportDateIso([], now)).toBe('2026-09-23')
  })

  it('keeps an ISO date while deriving it from the local day across UTC midnight', () => {
    const originalTimeZone = process.env.TZ
    process.env.TZ = 'Europe/Warsaw'
    try {
      const nowInWarsaw = new Date('2026-09-22T22:30:00.000Z')
      expect(resolveReportDateIso([], nowInWarsaw)).toBe('2026-09-23')
    } finally {
      process.env.TZ = originalTimeZone
    }
  })

  it('uses an ISO date supplied with --date', () => {
    expect(resolveReportDateIso(['--date', '2026-10-01'], now)).toBe('2026-10-01')
  })

  it('rejects a non-ISO --date value', () => {
    expect(() => resolveReportDateIso(['--date', '01-10-2026'], now)).toThrow('--date must be an ISO date (YYYY-MM-DD).')
  })
})
