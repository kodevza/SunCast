import { formatMinuteOfDay, parseHhmmToMinuteOfDay, scaleProfile, sumProfiles } from '../../geometry/sun/profileAggregation'

export interface IrradianceSample {
  timestampIso: string
  irradianceWm2: number
}

export interface ForecastPoint {
  minuteOfDay: number
  timeLabel: string
  estimatedKw: number
}

const HOURLY_FORECAST_INTERVAL_HOURS = 1

export function calculateHourlyForecastEnergyKwh(points: readonly ForecastPoint[]): number {
  return points.reduce((totalEnergyKwh, point) => {
    if (!Number.isFinite(point.estimatedKw) || point.estimatedKw <= 0) return totalEnergyKwh
    return totalEnergyKwh + point.estimatedKw * HOURLY_FORECAST_INTERVAL_HOURS
  }, 0)
}

export function createRoofForecastProfile(
  samples: readonly IrradianceSample[],
  dateIso: string,
  kwp: number,
): Array<{ minuteOfDay: number; value: number }> {
  const profile: Array<{ minuteOfDay: number; value: number }> = []
  for (const sample of samples) {
    if (!sample.timestampIso.startsWith(dateIso)) continue
    const minuteOfDay = parseHhmmToMinuteOfDay(sample.timestampIso.slice(11, 16))
    const irradianceWm2 = Number(sample.irradianceWm2)
    if (minuteOfDay === null || !Number.isFinite(irradianceWm2) || irradianceWm2 <= 0) continue
    profile.push({ minuteOfDay, value: irradianceWm2 })
  }
  return scaleProfile(profile, kwp / 1000)
}

export function aggregateForecastProfiles(profiles: ReadonlyArray<ReadonlyArray<{ minuteOfDay: number; value: number }>>): ForecastPoint[] {
  return sumProfiles(profiles.map((profile) => [...profile])).map((point) => ({
    minuteOfDay: point.minuteOfDay,
    timeLabel: formatMinuteOfDay(point.minuteOfDay),
    estimatedKw: point.value,
  }))
}

export function mergeSettledRoofForecasts(
  settled: readonly PromiseSettledResult<Array<{ minuteOfDay: number; value: number }>>[],
): { points: ForecastPoint[]; failedRoofCount: number; succeededRoofCount: number } {
  const profiles: Array<Array<{ minuteOfDay: number; value: number }>> = []
  let failedRoofCount = 0
  for (const result of settled) {
    if (result.status === 'fulfilled') profiles.push(result.value)
    else failedRoofCount += 1
  }
  return { points: aggregateForecastProfiles(profiles), failedRoofCount, succeededRoofCount: profiles.length }
}
