import { parseIsoDateTimeWithTimezone } from '../../../geometry/sun/sunPosition'
import { dateIsoInTimeZone, formatDateIsoLocal } from '../../../shared/utils/dateIsoLocal'

function formatOffset(offsetMinutesWest: number): string {
  const offsetMinutesEast = -offsetMinutesWest
  const sign = offsetMinutesEast >= 0 ? '+' : '-'
  const absoluteMinutes = Math.abs(offsetMinutesEast)
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0')
  const minutes = String(absoluteMinutes % 60).padStart(2, '0')
  return `${sign}${hours}:${minutes}`
}

function formatTimePart(date: Date): string {
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${hour}:${minute}:${second}`
}

export function formatIsoDateTimeWithLocalOffset(date: Date): string {
  return `${formatDateIsoLocal(date)}T${formatTimePart(date)}${formatOffset(date.getTimezoneOffset())}`
}

export function extractDateIsoInTimeZone(datetimeIso: string, timeZone: string): string | null {
  const parsed = parseIsoDateTimeWithTimezone(datetimeIso.trim())
  if (!parsed) {
    return null
  }
  return dateIsoInTimeZone(parsed, timeZone)
}

export function extractYearInTimeZone(datetimeIso: string, timeZone: string): number | null {
  const dateIso = extractDateIsoInTimeZone(datetimeIso, timeZone)
  if (!dateIso) {
    return null
  }
  const year = Number(dateIso.slice(0, 4))
  return Number.isInteger(year) ? year : null
}
