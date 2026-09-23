import { describe, expect, it } from 'vitest'
import { resolveReportDateIso } from './reportDate'

describe('resolveReportDateIso', () => {
  const now = new Date('2026-09-23T15:30:00.000Z')

  it('uses today when the command does not provide --date', () => {
    expect(resolveReportDateIso([], now)).toBe('2026-09-23')
  })

  it('uses an ISO date supplied with --date', () => {
    expect(resolveReportDateIso(['--date', '2026-10-01'], now)).toBe('2026-10-01')
  })

  it('rejects a non-ISO --date value', () => {
    expect(() => resolveReportDateIso(['--date', '01-10-2026'], now)).toThrow('--date must be an ISO date (YYYY-MM-DD).')
  })
})
