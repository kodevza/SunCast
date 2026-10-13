const YEAR_PATTERN = /^\d{4}$/

export function resolveReportYear(options: string[]): number | undefined {
  const yearOptionIndex = options.indexOf('--year')
  if (yearOptionIndex === -1) return undefined
  const value = options[yearOptionIndex + 1]
  const year = Number(value)
  if (!value || !YEAR_PATTERN.test(value) || !Number.isInteger(year) || year < 1) {
    throw new Error('--year must be a four-digit year (YYYY).')
  }
  return year
}
