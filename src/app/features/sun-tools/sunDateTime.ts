import { parseIsoDateTimeWithTimezone } from '../../../geometry/sun/sunPosition'

const zonedDateFormatterCache = new Map<string, Intl.DateTimeFormat>()

function getZonedDateFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = zonedDateFormatterCache.get(timeZone)
  if (cached) {
    return cached
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  zonedDateFormatterCache.set(timeZone, formatter)
  return formatter
}

function formatOffset(offsetMinutesWest: number): string {
  const offsetMinutesEast = -offsetMinutesWest
  const sign = offsetMinutesEast >= 0 ? '+' : '-'
  const absoluteMinutes = Math.abs(offsetMinutesEast)
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0')
  const minutes = String(absoluteMinutes % 60).padStart(2, '0')
  return `${sign}${hours}:${minutes}`
}

function formatDatePart(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimePart(date: Date): string {
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${hour}:${minute}:${second}`
}

function getZonedDateParts(date: Date, timeZone: string): { year: number; month: number; day: number } | null {
  try {
    const parts = getZonedDateFormatter(timeZone).formatToParts(date)
    const byType = new Map(parts.map((part) => [part.type, part.value]))
    const year = Number(byType.get('year'))
    const month = Number(byType.get('month'))
    const day = Number(byType.get('day'))
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return null
    }
    return { year, month, day }
  } catch {
    return null
  }
}

export function formatIsoDateTimeWithLocalOffset(date: Date): string {
  return `${formatDatePart(date)}T${formatTimePart(date)}${formatOffset(date.getTimezoneOffset())}`
}

export function extractDateIsoInTimeZone(datetimeIso: string, timeZone: string): string | null {
  const parsed = parseIsoDateTimeWithTimezone(datetimeIso.trim())
  if (!parsed) {
    return null
  }
  const parts = getZonedDateParts(parsed, timeZone)
  if (!parts) {
    return null
  }
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

export function extractYearInTimeZone(datetimeIso: string, timeZone: string): number | null {
  const dateIso = extractDateIsoInTimeZone(datetimeIso, timeZone)
  if (!dateIso) {
    return null
  }
  const year = Number(dateIso.slice(0, 4))
  return Number.isInteger(year) ? year : null
}

