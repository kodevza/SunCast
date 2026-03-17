export const MINUTES_PER_HOUR = 60
export const MS_PER_MINUTE = 60_000
const MS_PER_DAY = 86_400_000

export function formatDateIsoUtc(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateIsoUtc(dateIso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    return null
  }

  const [yearRaw, monthRaw, dayRaw] = dateIso.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null
  }

  const ts = Date.UTC(year, month - 1, day)
  if (!Number.isFinite(ts)) {
    return null
  }

  const normalized = new Date(ts)
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() + 1 !== month ||
    normalized.getUTCDate() !== day
  ) {
    return null
  }

  return ts
}

export function getDateIsosForYear(year: number): string[] {
  if (!Number.isInteger(year) || year < 1) {
    return []
  }

  const dates: string[] = []
  for (let ts = Date.UTC(year, 0, 1); ; ts += MS_PER_DAY) {
    const date = new Date(ts)
    if (date.getUTCFullYear() !== year) {
      break
    }
    dates.push(formatDateIsoUtc(date))
  }

  return dates
}

export function getDateIsosForRange(startDateIso: string, endDateIso: string): string[] {
  const startTs = parseDateIsoUtc(startDateIso)
  const endTs = parseDateIsoUtc(endDateIso)
  if (startTs === null || endTs === null || endTs < startTs) {
    return []
  }

  const dates: string[] = []
  for (let ts = startTs; ts <= endTs; ts += MS_PER_DAY) {
    dates.push(formatDateIsoUtc(new Date(ts)))
  }

  return dates
}
