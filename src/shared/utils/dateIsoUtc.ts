export const MINUTES_PER_HOUR = 60
export const MS_PER_MINUTE = 60_000
const MS_PER_DAY = 86_400_000

export function formatDateIsoUtc(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDateIsoParts(year: number, month1Based: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month1Based).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatDateDdMm(dateIso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso)
  if (!match) {
    return dateIso
  }
  return `${match[3]}/${match[2]}`
}

export interface DateDdMmInput {
  day: number
  month: number
  year: number | null
}

export function parseDateDdMmInput(value: string): DateDdMmInput | null {
  const trimmedValue = value.trim()
  const slashMatch = /^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{4}))?$/.exec(trimmedValue)
  if (slashMatch) {
    const day = Number(slashMatch[1])
    const month = Number(slashMatch[2])
    const year = slashMatch[3] ? Number(slashMatch[3]) : null
    if (!Number.isInteger(day) || !Number.isInteger(month) || (year !== null && !Number.isInteger(year))) {
      return null
    }
    return { day, month, year }
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue)
  if (!isoMatch) {
    return null
  }

  const year = Number(isoMatch[1])
  const month = Number(isoMatch[2])
  const day = Number(isoMatch[3])
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return null
  }

  return { day, month, year }
}

function toIsoDate(year: number, month1Based: number, day: number): string | null {
  const dateIso = formatDateIsoParts(year, month1Based, day)
  if (parseDateIsoUtc(dateIso) === null) {
    return null
  }
  return dateIso
}

export function parseDateDdMmToIso(value: string, year: number): string | null {
  const parsed = parseDateDdMmInput(value)
  if (!parsed) {
    return null
  }

  return toIsoDate(parsed.year ?? year, parsed.month, parsed.day)
}

export function firstDayOfYearIso(year: number): string {
  return formatDateIsoParts(year, 1, 1)
}

export function lastDayOfYearIso(year: number): string {
  return formatDateIsoParts(year, 12, 31)
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
