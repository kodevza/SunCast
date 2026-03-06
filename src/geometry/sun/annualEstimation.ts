import type { RoofPlane } from '../../types/geometry'
import { getDailyPoaSeries } from './dailyEstimation'

const MINUTES_PER_DAY = 24 * 60

export interface AnnualAggregatedDayProfileInput {
  year: number
  timeZone: string
  latDeg: number
  lonDeg: number
  plane: RoofPlane
  stepMinutes?: number
  sampleWindowDays?: number
}

export interface AnnualAggregatedDayProfilePoint {
  timeLabel: string
  minuteOfDay: number
  value: number
  sampleCount: number
}

export interface AnnualAggregatedDayProfile {
  points: AnnualAggregatedDayProfilePoint[]
  meta: {
    year: number
    stepMinutes: number
    dayCount: number
    sampleWindowDays: number
    sampledDayCount: number
    nonZeroBuckets: number
  }
}

function formatDateIsoUtc(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateIsosForYear(year: number): string[] {
  if (!Number.isInteger(year) || year < 1) {
    return []
  }

  const dates: string[] = []
  for (let ts = Date.UTC(year, 0, 1); ; ts += 86_400_000) {
    const date = new Date(ts)
    if (date.getUTCFullYear() !== year) {
      break
    }
    dates.push(formatDateIsoUtc(date))
  }
  return dates
}

function parseTimeLabelToMinuteOfDay(label: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(label)
  if (!match) {
    return null
  }

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null
  }
  return hour * 60 + minute
}

function formatMinuteOfDay(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function getAnnualAggregatedDayProfile(input: AnnualAggregatedDayProfileInput): AnnualAggregatedDayProfile | null {
  const stepMinutes = Math.max(1, Math.floor(input.stepMinutes ?? 15))
  const sampleWindowDays = Math.max(1, Math.floor(input.sampleWindowDays ?? 5))
  const dateIsos = getDateIsosForYear(input.year)
  if (dateIsos.length === 0) {
    return null
  }

  const bucketMinutes: number[] = []
  const minuteToBucketIndex = new Map<number, number>()
  for (let minute = 0; minute < MINUTES_PER_DAY; minute += stepMinutes) {
    minuteToBucketIndex.set(minute, bucketMinutes.length)
    bucketMinutes.push(minute)
  }

  const totals = bucketMinutes.map(() => 0)
  const sampleCounts = bucketMinutes.map(() => 0)
  let sampledDayCount = 0

  for (let dayIndex = 0; dayIndex < dateIsos.length; dayIndex += sampleWindowDays) {
    const dateIso = dateIsos[dayIndex]
    const windowWeight = Math.min(sampleWindowDays, dateIsos.length - dayIndex)
    const series = getDailyPoaSeries({
      dateIso,
      timeZone: input.timeZone,
      latDeg: input.latDeg,
      lonDeg: input.lonDeg,
      plane: input.plane,
      stepMinutes,
    })

    if (!series) {
      continue
    }
    sampledDayCount += 1

    for (let idx = 0; idx < series.labels.length; idx += 1) {
      const minuteOfDay = parseTimeLabelToMinuteOfDay(series.labels[idx])
      if (minuteOfDay === null) {
        continue
      }

      const bucketIndex = minuteToBucketIndex.get(minuteOfDay)
      if (bucketIndex === undefined) {
        continue
      }

      const value = series.values_Wm2[idx]
      if (!Number.isFinite(value) || value < 0) {
        continue
      }

      totals[bucketIndex] += value * windowWeight
      sampleCounts[bucketIndex] += windowWeight
    }
  }

  const points: AnnualAggregatedDayProfilePoint[] = []
  for (let idx = 0; idx < bucketMinutes.length; idx += 1) {
    const sampleCount = sampleCounts[idx]
    if (sampleCount <= 0) {
      continue
    }

    points.push({
      timeLabel: formatMinuteOfDay(bucketMinutes[idx]),
      minuteOfDay: bucketMinutes[idx],
      value: totals[idx],
      sampleCount,
    })
  }

  if (points.length === 0) {
    return null
  }

  return {
    points,
    meta: {
      year: input.year,
      stepMinutes,
      dayCount: dateIsos.length,
      sampleWindowDays,
      sampledDayCount,
      nonZeroBuckets: points.length,
    },
  }
}
