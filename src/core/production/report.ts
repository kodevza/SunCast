import { MEASUREMENT_ASSUMPTIONS, type MeasurementAssumption } from '../measurements'
import type { SelectedRoofSunInput } from '../../types/presentation-contracts'
import {
  calculateHourlyForecastEnergyKwh,
  createRoofForecastProfile,
  mergeSettledRoofForecasts,
  type ForecastPoint,
  type IrradianceSample,
} from './forecast'

export interface ForecastRoofProvider {
  (roof: SelectedRoofSunInput, dateIso: string, signal?: AbortSignal): Promise<IrradianceSample[]>
}

export interface ForecastProductionReport {
  status: 'ready' | 'unavailable' | 'no-input'
  dateIso: string
  totalSelectedKwp: number
  points: ForecastPoint[]
  totalEnergyKwh: number | null
  peak: { timeLabel: string; powerKw: number } | null
  assumptions: readonly MeasurementAssumption[]
  warnings: string[]
}

export async function getForecastProductionReport({
  dateIso,
  roofs,
  fetchRoofIrradiance,
  signal,
}: {
  dateIso: string
  roofs: readonly SelectedRoofSunInput[]
  fetchRoofIrradiance: ForecastRoofProvider
  signal?: AbortSignal
}): Promise<ForecastProductionReport> {
  const activeRoofs = roofs.filter((roof) => Number.isFinite(roof.kwp) && roof.kwp > 0)
  const totalSelectedKwp = activeRoofs.reduce((sum, roof) => sum + roof.kwp, 0)
  if (!dateIso || activeRoofs.length === 0) {
    return { status: 'no-input', dateIso, totalSelectedKwp, points: [], totalEnergyKwh: null, peak: null, assumptions: MEASUREMENT_ASSUMPTIONS, warnings: ['Brak rozwiązanych połaci z mocą kWp większą od zera.'] }
  }

  const settled = await Promise.allSettled(activeRoofs.map(async (roof) => createRoofForecastProfile(await fetchRoofIrradiance(roof, dateIso, signal), dateIso, roof.kwp)))
  const merged = mergeSettledRoofForecasts(settled)
  if (merged.failedRoofCount > 0) {
    return {
      status: 'unavailable', dateIso, totalSelectedKwp, points: [], totalEnergyKwh: null, peak: null,
      assumptions: MEASUREMENT_ASSUMPTIONS,
      warnings: [`Prognoza niedostępna dla ${merged.failedRoofCount} z ${activeRoofs.length} zaznaczonych połaci; częściowa suma nie jest prezentowana.`],
    }
  }
  const peak = merged.points.reduce<ForecastPoint | null>((best, point) => (!best || point.estimatedKw > best.estimatedKw ? point : best), null)
  return {
    status: 'ready', dateIso, totalSelectedKwp, points: merged.points,
    totalEnergyKwh: calculateHourlyForecastEnergyKwh(merged.points),
    peak: peak ? { timeLabel: peak.timeLabel, powerKw: peak.estimatedKw } : null,
    assumptions: MEASUREMENT_ASSUMPTIONS, warnings: merged.points.length === 0 ? ['Dostawca nie zwrócił punktów dziennych.'] : [],
  }
}
