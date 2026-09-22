import { getAnnualAggregatedDayProfile, getAnnualMonthlyEnergyEstimate } from '../../geometry/sun/annualEstimation'
import { SUN_DAILY_SERIES_STEP_MINUTES, getDailyPoaSeries } from '../../geometry/sun/dailyEstimation'
import { formatMinuteOfDay, parseHhmmToMinuteOfDay, scaleProfile, sumProfiles } from '../../geometry/sun/profileAggregation'
import { planeSlopeFromPitchAzimuth } from '../../geometry/solver/metrics'
import type { RoofPlane } from '../../types/geometry'
import type { SelectedRoofSunInput } from '../../types/presentation-contracts'

interface DailyProductionRoofInput {
  footprintId: string
  latDeg: number
  lonDeg: number
  kwp: number
  roofPlane: RoofPlane
}

export interface DerivedDailyProductionProfile {
  labels: string[]
  productionValues_kW: number[]
  sunriseTs: number
  sunsetTs: number
  peakProductionValue_kW: number
  peakProductionTimeLabel: string
}

export function deriveDailyProductionProfile({ dateIso, timeZone, selectedRoofs, computationEnabled = true }: {
  dateIso: string
  timeZone: string
  selectedRoofs: DailyProductionRoofInput[]
  computationEnabled?: boolean
}): DerivedDailyProductionProfile | null {
  if (!computationEnabled || !dateIso || !selectedRoofs.some((roof) => roof.kwp > 0 && Number.isFinite(roof.kwp))) return null
  const profiles = selectedRoofs.flatMap((roof) => {
    if (!Number.isFinite(roof.kwp) || roof.kwp <= 0) return []
    const series = getDailyPoaSeries({ dateIso, timeZone, latDeg: roof.latDeg, lonDeg: roof.lonDeg, plane: roof.roofPlane, stepMinutes: SUN_DAILY_SERIES_STEP_MINUTES })
    if (!series) return []
    const points = series.labels.flatMap((label, index) => {
      const minuteOfDay = parseHhmmToMinuteOfDay(label)
      const value = series.values_Wm2[index]
      return minuteOfDay === null || !Number.isFinite(value) ? [] : [{ minuteOfDay, value }]
    })
    return [{ sunriseTs: series.sunriseTs, sunsetTs: series.sunsetTs, points: scaleProfile(points, roof.kwp / 1000) }]
  })
  if (profiles.length === 0) return null
  const points = sumProfiles(profiles.map((profile) => profile.points)).filter((point) => Number.isFinite(point.value))
  if (points.length === 0) return null
  const values = points.map((point) => point.value)
  const peakIndex = values.reduce((best, value, index) => value > values[best] ? index : best, 0)
  const labels = points.map((point) => formatMinuteOfDay(point.minuteOfDay))
  return { labels, productionValues_kW: values, sunriseTs: Math.min(...profiles.map((profile) => profile.sunriseTs)), sunsetTs: Math.max(...profiles.map((profile) => profile.sunsetTs)), peakProductionValue_kW: values[peakIndex], peakProductionTimeLabel: labels[peakIndex] }
}

export function deriveMonthlyProduction({ year, timeZone, selectedRoofs, computationEnabled = true }: {
  year: number
  timeZone: string
  selectedRoofs: SelectedRoofSunInput[]
  computationEnabled?: boolean
}): number[] | null {
  if (!computationEnabled || selectedRoofs.length === 0) return null
  const totals = Array.from({ length: 12 }, () => 0)
  let hasData = false
  for (const roof of selectedRoofs) {
    if (!Number.isFinite(roof.kwp) || roof.kwp <= 0) continue
    const { p, q } = planeSlopeFromPitchAzimuth(roof.roofPitchDeg, roof.roofAzimuthDeg)
    const monthly = getAnnualMonthlyEnergyEstimate({ year, timeZone, latDeg: roof.latDeg, lonDeg: roof.lonDeg, plane: { p, q, r: roof.roofPlane.r }, stepMinutes: 15 })
    if (!monthly) continue
    hasData = true
    monthly.months.forEach((month, index) => { totals[index] += month.energyWhm2Estimate * (roof.kwp / 1000) })
  }
  return hasData ? totals : null
}

export interface DerivedAnnualDayProfile {
  points: Array<{ minuteOfDay: number; timeLabel: string; value: number }>
  meta: { dayCount: number; sampledDayCount: number; sampleWindowDays: number; stepMinutes: number; nonZeroBuckets: number }
}

export function deriveAnnualDayProfile({ year, timeZone, selectedRoofs, computationEnabled = true }: {
  year: number
  timeZone: string
  selectedRoofs: SelectedRoofSunInput[]
  computationEnabled?: boolean
}): DerivedAnnualDayProfile | null {
  if (!computationEnabled || selectedRoofs.length === 0) return null
  const profiles = selectedRoofs.flatMap((roof) => {
    const { p, q } = planeSlopeFromPitchAzimuth(roof.roofPitchDeg, roof.roofAzimuthDeg)
    const profile = getAnnualAggregatedDayProfile({ year, timeZone, latDeg: roof.latDeg, lonDeg: roof.lonDeg, plane: { p, q, r: roof.roofPlane.r }, stepMinutes: 15 })
    return profile ? [{ meta: profile.meta, points: scaleProfile(profile.points, roof.kwp / 1000) }] : []
  })
  if (profiles.length === 0) return null
  const points = sumProfiles(profiles.map((profile) => profile.points)).map((point) => ({ ...point, timeLabel: formatMinuteOfDay(point.minuteOfDay) }))
  if (points.length === 0) return null
  const meta = profiles[0].meta
  return { points, meta: { ...meta, nonZeroBuckets: points.length } }
}
