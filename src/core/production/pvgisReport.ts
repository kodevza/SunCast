import type { SelectedRoofSunInput } from '../../types/presentation-contracts'
import {
  fetchPvgisDailyProduction,
  fetchPvgisFixedAnnualYield,
  type PvgisRoofEstimateResult,
} from '../providers/pvgis'

export interface PvgisProductionReport {
  status: 'ready' | 'unavailable' | 'no-input'
  provider: 'PVGIS PVcalc'
  dateIso: string
  /** The explicitly selected PVGIS climate-data year, if any. */
  year: number | null
  totalSelectedKwp: number
  dailyEnergyKwh: number | null
  annualEnergyKwh: number | null
  monthlyEnergyKwh: Array<{ month: number; energyKwh: number }>
  warnings: string[]
}

type PvgisFetcher = (roof: SelectedRoofSunInput, year?: number) => Promise<PvgisRoofEstimateResult>
type PvgisDailyFetcher = (roof: SelectedRoofSunInput, dateIso: string) => Promise<number>

function monthIndexFromIsoDate(dateIso: string): number | null {
  const match = /^(?:\d{4})-(\d{2})-\d{2}$/.exec(dateIso)
  if (!match) return null
  const month = Number(match[1])
  return month >= 1 && month <= 12 ? month - 1 : null
}

function roundKwh(value: number): number {
  return Math.round(value * 1000) / 1000
}

/**
 * Aggregates PVGIS PVcalc estimates without returning a misleading partial total.
 * `dailyEnergyKwh` is calculated from PVGIS hourly production records for `dateIso`.
 */
export async function getPvgisProductionReport({
  dateIso,
  year,
  roofs,
  fetchRoofEstimate = (roof, selectedYear) => fetchPvgisFixedAnnualYield({ ...roof, year: selectedYear }),
  fetchRoofDailyEnergy = (roof, selectedDateIso) => fetchPvgisDailyProduction({ ...roof, dateIso: selectedDateIso }),
}: {
  dateIso: string
  year?: number
  roofs: readonly SelectedRoofSunInput[]
  fetchRoofEstimate?: PvgisFetcher
  fetchRoofDailyEnergy?: PvgisDailyFetcher
}): Promise<PvgisProductionReport> {
  const activeRoofs = roofs.filter((roof) => Number.isFinite(roof.kwp) && roof.kwp > 0)
  const totalSelectedKwp = activeRoofs.reduce((sum, roof) => sum + roof.kwp, 0)
  const monthIndex = monthIndexFromIsoDate(dateIso)
  const emptyMonths = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, energyKwh: 0 }))
  if (activeRoofs.length === 0 || monthIndex === null) {
    return {
      status: 'no-input', provider: 'PVGIS PVcalc', dateIso, year: year ?? null, totalSelectedKwp,
      dailyEnergyKwh: null, annualEnergyKwh: null, monthlyEnergyKwh: emptyMonths,
      warnings: ['No solved roofs with a positive kWp capacity, or the report date is invalid.'],
    }
  }

  const [monthlySettled, dailySettled] = await Promise.all([
    Promise.allSettled(activeRoofs.map((roof) => fetchRoofEstimate(roof, year))),
    Promise.allSettled(activeRoofs.map((roof) => fetchRoofDailyEnergy(roof, dateIso))),
  ])
  const failedCount = monthlySettled.filter((result) => result.status === 'rejected').length
    + dailySettled.filter((result) => result.status === 'rejected').length
  if (failedCount > 0) {
    return {
      status: 'unavailable', provider: 'PVGIS PVcalc', dateIso, year: year ?? null, totalSelectedKwp,
      dailyEnergyKwh: null, annualEnergyKwh: null, monthlyEnergyKwh: emptyMonths,
      warnings: [`PVGIS is unavailable for ${failedCount} roof-provider requests; a partial aggregate is not shown.`],
    }
  }

  const estimates = monthlySettled.map((result) => (result as PromiseFulfilledResult<PvgisRoofEstimateResult>).value)
  const dailyEstimates = dailySettled.map((result) => (result as PromiseFulfilledResult<number>).value)
  const monthlyTotals = Array.from({ length: 12 }, () => 0)
  const dailyEnergyKwh = dailyEstimates.reduce((sum, energyKwh) => sum + energyKwh, 0)
  const annualEnergyKwh = estimates.reduce<number | null>((sum, estimate) => {
    if (sum === null || estimate.annualYieldKwh === null) return null
    return sum + estimate.annualYieldKwh
  }, 0)
  for (const estimate of estimates) {
    for (let index = 0; index < 12; index += 1) monthlyTotals[index] += estimate.monthlyYieldKwh[index] ?? 0
  }

  return {
    status: 'ready', provider: 'PVGIS PVcalc', dateIso, year: year ?? null, totalSelectedKwp,
    dailyEnergyKwh: Number.isFinite(dailyEnergyKwh) ? roundKwh(dailyEnergyKwh) : null,
    annualEnergyKwh,
    monthlyEnergyKwh: monthlyTotals.map((energyKwh, index) => ({ month: index + 1, energyKwh })),
    warnings: ['Daily energy is calculated from PVGIS hourly records for --date; it is not a weather forecast or inverter reading.'],
  }
}
