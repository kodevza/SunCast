import { getPvgisPvcalc, type PvgisPvcalcResponse } from '../../../clients/pvgisClient'

export interface PvgisRoofEstimateInput {
  latDeg: number
  lonDeg: number
  kwp: number
  roofPitchDeg: number
  roofAzimuthDeg: number
  lossPercent?: number
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}

export interface PvgisRoofEstimateResult {
  annualYieldKwh: number | null
  monthlyYieldKwh: number[]
  response: PvgisPvcalcResponse
}

export function extractPvgisFixedAnnualYield(response: PvgisPvcalcResponse): number | null {
  const fixed = response.outputs?.totals?.fixed
  const annualYield = Number(fixed?.E_y)
  return Number.isFinite(annualYield) ? annualYield : null
}

export function extractPvgisFixedMonthlyYield(response: PvgisPvcalcResponse): number[] {
  const monthly = response.outputs?.monthly?.fixed ?? []
  return monthly.map((entry) => Number(entry.E_m)).filter((value) => Number.isFinite(value))
}

export async function fetchPvgisFixedAnnualYield({
  latDeg,
  lonDeg,
  kwp,
  roofPitchDeg,
  roofAzimuthDeg,
  lossPercent = 14,
  signal,
  fetchImpl,
}: PvgisRoofEstimateInput): Promise<PvgisRoofEstimateResult> {
  const response = await getPvgisPvcalc({
    latDeg,
    lonDeg,
    peakPowerKw: kwp,
    lossPercent,
    angleDeg: roofPitchDeg,
    aspectDeg: roofAzimuthDeg,
    signal,
    fetchImpl,
  })

  return {
    annualYieldKwh: extractPvgisFixedAnnualYield(response),
    monthlyYieldKwh: extractPvgisFixedMonthlyYield(response),
    response,
  }
}
