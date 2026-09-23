const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function resolveReportDateIso(options: string[], now = new Date()): string {
  const dateOptionIndex = options.indexOf('--date')
  if (dateOptionIndex === -1) {
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const dateIso = options[dateOptionIndex + 1]
  if (!dateIso || !isIsoDate(dateIso)) {
    throw new Error('--date must be an ISO date (YYYY-MM-DD).')
  }
  return dateIso
}
