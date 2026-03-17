import type { RoofPlane } from '../../types/geometry'
import { getDailyPoaSeries } from './dailyEstimation'
import { getDateIsosForYear, parseDateIsoUtc } from '../../shared/utils/dateIsoUtc'
import { getZonedDateTimeParts } from '../../shared/utils/dateIsoLocal'

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

function formatMinuteOfDay(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseMonthFromDateIso(dateIso: string): number | null {
  const ts = parseDateIsoUtc(dateIso)
  if (ts === null) {
    return null
  }
  return new Date(ts).getUTCMonth() + 1
}

function minuteOfDayFromTimestamp(timestamp: number, timeZone: string): number | null {
  const zoned = getZonedDateTimeParts(timestamp, timeZone)
  if (!zoned) {
    return null
  }
  const { hour, minute } = zoned
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
