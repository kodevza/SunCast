import type { RoofPlane } from '../../types/geometry'
import { getDailyPoaSeries } from './dailyEstimation'

const MINUTES_PER_DAY = 24 * 60
const zonedHourMinuteFormatterCache = new Map<string, Intl.DateTimeFormat>()

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

export interface AnnualMonthlyEnergyEstimateInput {
  year: number
  timeZone: string
  latDeg: number
  lonDeg: number
  plane: RoofPlane
  stepMinutes?: number
  sampleWindowDays?: number
}

export interface AnnualMonthlyEnergyEstimate {
  months: Array<{
    month: number
    energyWhm2Estimate: number
  }>
  meta: {
    year: number
    stepMinutes: number
    dayCount: number
    sampleWindowDays: number
    sampledDayCount: number
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

function formatMinuteOfDay(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseMonthFromDateIso(dateIso: string): number | null {
  const match = /^\d{4}-(\d{2})-\d{2}$/.exec(dateIso)
  if (!match) {
    return null
  }
  const month = Number(match[1])
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }
  return month
}

function getZonedHourMinuteFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = zonedHourMinuteFormatterCache.get(timeZone)
  if (cached) {
    return cached
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })
  zonedHourMinuteFormatterCache.set(timeZone, formatter)
  return formatter
}

function minuteOfDayFromTimestamp(timestamp: number, timeZone: string): number | null {
  const formatter = getZonedHourMinuteFormatter(timeZone)
  const parts = formatter.formatToParts(new Date(timestamp))
  const hourPart = parts.find((part) => part.type === 'hour')
  const minutePart = parts.find((part) => part.type === 'minute')

  const hour = Number(hourPart?.value)
  const minute = Number(minutePart?.value)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null
  }
  return hour * 60 + minute
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

    for (let idx = 0; idx < series.timestamps.length; idx += 1) {
      const minuteOfDay = minuteOfDayFromTimestamp(series.timestamps[idx], input.timeZone)
      if (minuteOfDay === null) {
        continue
      }

      const bucketMinute = Math.floor(minuteOfDay / stepMinutes) * stepMinutes
      const bucketIndex = minuteToBucketIndex.get(bucketMinute)
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

export function getAnnualMonthlyEnergyEstimate(input: AnnualMonthlyEnergyEstimateInput): AnnualMonthlyEnergyEstimate | null {
  const stepMinutes = Math.max(1, Math.floor(input.stepMinutes ?? 15))
  const sampleWindowDays = Math.max(1, Math.floor(input.sampleWindowDays ?? 5))
  const dateIsos = getDateIsosForYear(input.year)
  if (dateIsos.length === 0) {
    return null
  }

  const monthlyTotalsWhm2 = Array.from({ length: 12 }, () => 0)
  const stepHours = stepMinutes / 60
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

    const sampledDayEnergyWhm2 = series.values_Wm2.reduce((sum, value) => {
      if (!Number.isFinite(value) || value < 0) {
        return sum
      }
      return sum + value * stepHours
    }, 0)

    for (let offset = 0; offset < windowWeight; offset += 1) {
      const windowDateIso = dateIsos[dayIndex + offset]
      const month = parseMonthFromDateIso(windowDateIso)
      if (month === null) {
        continue
      }
      monthlyTotalsWhm2[month - 1] += sampledDayEnergyWhm2
    }
  }

  return {
    months: monthlyTotalsWhm2.map((energyWhm2Estimate, index) => ({
      month: index + 1,
      energyWhm2Estimate,
    })),
    meta: {
      year: input.year,
      stepMinutes,
      dayCount: dateIsos.length,
      sampleWindowDays,
      sampledDayCount,
    },
  }
}
