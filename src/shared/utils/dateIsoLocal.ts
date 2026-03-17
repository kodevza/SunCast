const MS_PER_MINUTE = 60_000
const MS_PER_DAY = 86_400_000

export interface ZonedDateParts {
  year: number
  month: number
  day: number
}

export interface ZonedDateTimeParts extends ZonedDateParts {
  hour: number
  minute: number
  second: number
}

const zonedDateFormatterCache = new Map<string, Intl.DateTimeFormat>()
const zonedDateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>()
const hhmmFormatterCache = new Map<string, Intl.DateTimeFormat>()

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

function getZonedDateTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = zonedDateTimeFormatterCache.get(timeZone)
  if (cached) {
    return cached
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  zonedDateTimeFormatterCache.set(timeZone, formatter)
  return formatter
}

function getHhmmFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = hhmmFormatterCache.get(timeZone)
  if (cached) {
    return cached
  }

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })
  hhmmFormatterCache.set(timeZone, formatter)
  return formatter
}

function addOneDay(parts: ZonedDateParts): ZonedDateParts {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day) + MS_PER_DAY)
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  }
}

function minutesEpoch(parts: ZonedDateTimeParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) / MS_PER_MINUTE
}

export function formatDateIsoLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getZonedDateParts(value: number | Date, timeZone: string): ZonedDateParts | null {
  try {
    const date = typeof value === 'number' ? new Date(value) : value
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

export function getZonedDateTimeParts(value: number | Date, timeZone: string): ZonedDateTimeParts | null {
  try {
    const date = typeof value === 'number' ? new Date(value) : value
    const parts = getZonedDateTimeFormatter(timeZone).formatToParts(date)
    const byType = new Map(parts.map((part) => [part.type, part.value]))

    let year = Number(byType.get('year'))
    let month = Number(byType.get('month'))
    let day = Number(byType.get('day'))
    let hour = Number(byType.get('hour'))
    const minute = Number(byType.get('minute'))
    const second = Number(byType.get('second'))

    if (hour === 24) {
      hour = 0
      const next = addOneDay({ year, month, day })
      year = next.year
      month = next.month
      day = next.day
    }

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      !Number.isInteger(second)
    ) {
      return null
    }

    return { year, month, day, hour, minute, second }
  } catch {
    return null
  }
}

export function dateIsoInTimeZone(value: number | Date, timeZone: string): string | null {
  const parts = getZonedDateParts(value, timeZone)
  if (!parts) {
    return null
  }
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

export function formatTimestampHHmmInTimeZone(timestamp: number, timeZone: string): string {
  return getHhmmFormatter(timeZone).format(new Date(timestamp))
}

export function localDateTimeInTimeZoneToUtcTs(parts: ZonedDateTimeParts, timeZone: string): number {
  let guess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)

  for (let i = 0; i < 6; i += 1) {
    const zoned = getZonedDateTimeParts(guess, timeZone)
    if (!zoned) {
      return guess
    }
    const deltaMinutes = minutesEpoch(parts) - minutesEpoch(zoned)
    if (Math.abs(deltaMinutes) < 1 / 60) {
      return guess
    }
    guess += deltaMinutes * MS_PER_MINUTE
  }

  return guess
}
