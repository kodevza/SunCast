import type { RoofPlane } from '../../types/geometry'
import { computeSunProjection } from './sunProjection'
import { parseDateIsoUtc } from '../../shared/utils/dateIsoUtc'
import { formatTimestampHHmmInTimeZone, localDateTimeInTimeZoneToUtcTs } from '../../shared/utils/dateIsoLocal'

const MS_PER_MINUTE = 60_000
const MS_PER_DAY = 86_400_000

interface LocalDate {
  year: number
  month: number
  day: number
}

export interface SunriseSunsetInput {
  dateIso: string
  timeZone: string
  latDeg: number
  lonDeg: number
}

export interface SunriseSunsetResult {
  sunriseTs: number
  sunsetTs: number
}

export interface DailyPoaSeriesInput extends SunriseSunsetInput {
  plane: RoofPlane
  stepMinutes?: number
}

export interface DailyPoaSeries {
  labels: string[]
  values_Wm2: number[]
  timestamps: number[]
  sunriseTs: number
  sunsetTs: number
}

function parseDateIso(dateIso: string): LocalDate | null {
  const ts = parseDateIsoUtc(dateIso)
  if (ts === null) {
    return null
  }
  const normalized = new Date(ts)
  return {
    year: normalized.getUTCFullYear(),
    month: normalized.getUTCMonth() + 1,
    day: normalized.getUTCDate(),
  }
}

function addOneDay(localDate: LocalDate): LocalDate {
  const next = new Date(Date.UTC(localDate.year, localDate.month - 1, localDate.day) + MS_PER_DAY)
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  }
}

function sunElevationAt(timestamp: number, latDeg: number, lonDeg: number): number {
  return computeSunProjection({
    datetimeIso: new Date(timestamp).toISOString(),
    latDeg,
    lonDeg,
    plane: { p: 0, q: 0, r: 0 },
  }).sunElevationDeg
}

function refineCrossingTs(
  startTs: number,
  endTs: number,
  latDeg: number,
  lonDeg: number,
  kind: 'sunrise' | 'sunset',
): number {
  let left = startTs
  let right = endTs

  for (let i = 0; i < 22; i += 1) {
    const mid = left + (right - left) / 2
    const midElevation = sunElevationAt(mid, latDeg, lonDeg)

    if (kind === 'sunrise') {
      if (midElevation > 0) {
        right = mid
      } else {
        left = mid
      }
    } else if (midElevation > 0) {
      left = mid
    } else {
      right = mid
    }
  }

  return Math.round((left + right) / 2)
}

export function getSunriseSunset(input: SunriseSunsetInput): SunriseSunsetResult | null {
  const parsedDate = parseDateIso(input.dateIso)
  if (!parsedDate) {
    return null
  }

  const nextDate = addOneDay(parsedDate)
  const dayStartTs = localDateTimeInTimeZoneToUtcTs({ ...parsedDate, hour: 0, minute: 0, second: 0 }, input.timeZone)
  const nextDayStartTs = localDateTimeInTimeZoneToUtcTs({ ...nextDate, hour: 0, minute: 0, second: 0 }, input.timeZone)

  if (!Number.isFinite(dayStartTs) || !Number.isFinite(nextDayStartTs) || nextDayStartTs <= dayStartTs) {
    return null
  }

  const scanStepMs = 5 * MS_PER_MINUTE
  const sunriseCandidates: number[] = []
  const sunsetCandidates: number[] = []
  const scanStartTs = dayStartTs - MS_PER_DAY
  const scanEndTs = nextDayStartTs + MS_PER_DAY

  let previousTs = scanStartTs
  let previousElevation = sunElevationAt(previousTs, input.latDeg, input.lonDeg)

  for (let ts = scanStartTs + scanStepMs; ts <= scanEndTs; ts += scanStepMs) {
    const elevation = sunElevationAt(ts, input.latDeg, input.lonDeg)

    if (previousElevation <= 0 && elevation > 0) {
      sunriseCandidates.push(refineCrossingTs(previousTs, ts, input.latDeg, input.lonDeg, 'sunrise'))
    }

    if (previousElevation > 0 && elevation <= 0) {
      sunsetCandidates.push(refineCrossingTs(previousTs, ts, input.latDeg, input.lonDeg, 'sunset'))
    }

    previousTs = ts
    previousElevation = elevation
  }

  const sunriseTs = sunriseCandidates
    .filter((candidate) => candidate <= nextDayStartTs)
    .reduce<number | null>((latest, candidate) => (latest === null || candidate > latest ? candidate : latest), null)
  if (sunriseTs === null) {
    return null
  }

  const sunsetTs =
    sunsetCandidates.find((candidate) => candidate > sunriseTs) ??
    null

  if (sunsetTs === null || sunriseTs >= sunsetTs || sunriseTs >= scanEndTs || sunsetTs <= scanStartTs) {
    return null
  }

  return { sunriseTs, sunsetTs }
}

function formatTimeLabel(timestamp: number, timeZone: string): string {
  return formatTimestampHHmmInTimeZone(timestamp, timeZone)
}

export function getDailyPoaSeries(input: DailyPoaSeriesInput): DailyPoaSeries | null {
  const sunriseSunset = getSunriseSunset(input)
  if (!sunriseSunset) {
    return null
  }

  const stepMinutes = Math.max(1, Math.floor(input.stepMinutes ?? 15))
  const stepMs = stepMinutes * MS_PER_MINUTE

  const labels: string[] = []
  const values_Wm2: number[] = []
  const timestamps: number[] = []

  for (let timestamp = sunriseSunset.sunriseTs; timestamp <= sunriseSunset.sunsetTs; timestamp += stepMs) {
    const projection = computeSunProjection({
      datetimeIso: new Date(timestamp).toISOString(),
      latDeg: input.latDeg,
      lonDeg: input.lonDeg,
      plane: input.plane,
    })

    const poa = Number.isFinite(projection.poaIrradiance_Wm2) ? Math.max(0, projection.poaIrradiance_Wm2) : 0
    labels.push(formatTimeLabel(timestamp, input.timeZone))
    values_Wm2.push(poa)
    timestamps.push(timestamp)
  }

  if (labels.length === 0) {
    return null
  }

  return {
    labels,
    values_Wm2,
    timestamps,
    sunriseTs: sunriseSunset.sunriseTs,
    sunsetTs: sunriseSunset.sunsetTs,
  }
}

export function formatTimestampHHmm(timestamp: number, timeZone: string): string {
  return formatTimeLabel(timestamp, timeZone)
}

export function expectedSeriesPointCount(
  sunriseTs: number,
  sunsetTs: number,
  stepMinutes = 15,
): number {
  const stepMs = Math.max(1, Math.floor(stepMinutes)) * MS_PER_MINUTE
  return Math.floor((sunsetTs - sunriseTs) / stepMs) + 1
}

export const SUN_DAILY_SERIES_STEP_MINUTES = 15
