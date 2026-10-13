import { describe, expect, it } from 'vitest'
import { resolveReportYear } from './reportYear'

describe('resolveReportYear', () => {
  it('returns an optional PVGIS climate-data year', () => {
    expect(resolveReportYear([])).toBeUndefined()
    expect(resolveReportYear(['--year', '2023'])).toBe(2023)
  })

  it('rejects invalid years', () => {
    expect(() => resolveReportYear(['--year', '23'])).toThrow('--year must be a four-digit year')
  })
})
