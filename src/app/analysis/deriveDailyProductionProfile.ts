import { SUN_DAILY_SERIES_STEP_MINUTES, getDailyPoaSeries } from '../../geometry/sun/dailyEstimation'
import { formatMinuteOfDay, parseHhmmToMinuteOfDay, scaleProfile, sumProfiles } from '../../geometry/sun/profileAggregation'
import type { RoofPlane } from '../../types/geometry'

interface DailyProductionRoofInput {
  footprintId: string
  latDeg: number
  lonDeg: number
  kwp: number
  roofPlane: RoofPlane
}

interface DeriveDailyProductionProfileArgs {
  dateIso: string
  timeZone: string
  selectedRoofs: DailyProductionRoofInput[]
  computationEnabled?: boolean
}

export interface DerivedDailyProductionProfile {
  labels: string[]
  productionValues_kW: number[]
  sunriseTs: number
  sunsetTs: number
  peakProductionValue_kW: number
  peakProductionTimeLabel: string
}

export function deriveDailyProductionProfile({
  dateIso,
  timeZone,
  selectedRoofs,
  computationEnabled = true,
}: DeriveDailyProductionProfileArgs): DerivedDailyProductionProfile | null {
  const totalSelectedKwp = selectedRoofs.reduce(
    (sum, roof) => sum + (Number.isFinite(roof.kwp) && roof.kwp > 0 ? roof.kwp : 0),
    0,
  )

  if (!computationEnabled || !dateIso || selectedRoofs.length === 0 || totalSelectedKwp <= 0) {
    return null
  }

  const perRoofSeries = selectedRoofs
    .map((roof) => {
      const safeKwp = Number.isFinite(roof.kwp) && roof.kwp > 0 ? roof.kwp : 0
      if (safeKwp <= 0) {
        return null
      }

      const series = getDailyPoaSeries({
        dateIso,
        timeZone,
        latDeg: roof.latDeg,
        lonDeg: roof.lonDeg,
        plane: roof.roofPlane,
        stepMinutes: SUN_DAILY_SERIES_STEP_MINUTES,
      })

      if (!series) {
        return null
      }

      const baseProfile = series.labels
        .map((label, index) => {
          const minuteOfDay = parseHhmmToMinuteOfDay(label)
          if (minuteOfDay === null) {
            return null
          }

          return {
            minuteOfDay,
            value: series.values_Wm2[index],
          }
        })
        .filter((point): point is { minuteOfDay: number; value: number } => point !== null)

      return {
        sunriseTs: series.sunriseTs,
        sunsetTs: series.sunsetTs,
        productionKwContribution: scaleProfile(baseProfile, safeKwp / 1000),
      }
    })
    .filter((series): series is NonNullable<typeof series> => Boolean(series))

  if (perRoofSeries.length === 0) {
    return null
  }

  const productionKwPoints = sumProfiles(perRoofSeries.map((series) => series.productionKwContribution))
  if (productionKwPoints.length === 0) {
    return null
  }

  const points = productionKwPoints
    .map((point) => ({
      minuteOfDay: point.minuteOfDay,
      production_kW: point.value,
    }))
    .filter((point): point is { minuteOfDay: number; production_kW: number } => Number.isFinite(point.production_kW))

  if (points.length === 0) {
    return null
  }

  const sunriseTs = Math.min(...perRoofSeries.map((series) => series.sunriseTs))
  const sunsetTs = Math.max(...perRoofSeries.map((series) => series.sunsetTs))
  const labels = points.map((point) => formatMinuteOfDay(point.minuteOfDay))
  const productionValues_kW = points.map((point) => point.production_kW)
  const productionPeakIndex = productionValues_kW.reduce(
    (bestIndex, current, index, all) => (current > all[bestIndex] ? index : bestIndex),
    0,
  )

  return {
    labels,
    productionValues_kW,
    sunriseTs,
    sunsetTs,
    peakProductionValue_kW: productionValues_kW[productionPeakIndex],
    peakProductionTimeLabel: labels[productionPeakIndex],
  }
}
