export interface PvgisPvcalcResponse {
  outputs?: {
    monthly?: { fixed?: Array<{ E_m: number }> }
    totals?: { fixed?: { E_y?: number } }
  }
}

export interface PvgisRoofEstimateInput {
  latDeg: number
  lonDeg: number
  kwp: number
  roofPitchDeg: number
  roofAzimuthDeg: number
  lossPercent?: number
  signal?: AbortSignal
}

export interface PvgisRoofEstimateResult {
  annualYieldKwh: number | null
  monthlyYieldKwh: number[]
  response: PvgisPvcalcResponse
}

const PVGIS_V53_PVCALC_URL = 'https://re.jrc.ec.europa.eu/api/v5_3/PVcalc'

function toPvgisAspectDeg(azimuthFromNorthDeg: number): number {
  const normalized = ((azimuthFromNorthDeg % 360) + 360) % 360
  const southCentered = normalized - 180
  if (southCentered > 180) return southCentered - 360
  return southCentered <= -180 ? southCentered + 360 : southCentered
}

export function extractPvgisFixedAnnualYield(response: PvgisPvcalcResponse): number | null {
  const annualYield = Number(response.outputs?.totals?.fixed?.E_y)
  return Number.isFinite(annualYield) ? annualYield : null
}

export function extractPvgisFixedMonthlyYield(response: PvgisPvcalcResponse): number[] {
  return (response.outputs?.monthly?.fixed ?? []).map((entry) => Number(entry.E_m)).filter(Number.isFinite)
}

export async function fetchPvgisFixedAnnualYield(
  { latDeg, lonDeg, kwp, roofPitchDeg, roofAzimuthDeg, lossPercent = 14, signal }: PvgisRoofEstimateInput,
  { fetchImpl = fetch }: FetchDependency = {},
): Promise<PvgisRoofEstimateResult> {
  const url = new URL(PVGIS_V53_PVCALC_URL)
  url.searchParams.set('lat', latDeg.toFixed(6))
  url.searchParams.set('lon', lonDeg.toFixed(6))
  url.searchParams.set('peakpower', kwp.toFixed(3))
  url.searchParams.set('loss', lossPercent.toFixed(2))
  url.searchParams.set('angle', roofPitchDeg.toFixed(2))
  url.searchParams.set('aspect', toPvgisAspectDeg(roofAzimuthDeg).toFixed(2))
  url.searchParams.set('fixed', '1')
  url.searchParams.set('outputformat', 'json')
  url.searchParams.set('browser', '0')
  const response = await fetchImpl(url, { signal })
  if (!response.ok) throw new Error(`PVGIS request failed with HTTP ${response.status}`)
  const payload = await response.json() as PvgisPvcalcResponse
  return { annualYieldKwh: extractPvgisFixedAnnualYield(payload), monthlyYieldKwh: extractPvgisFixedMonthlyYield(payload), response: payload }
}

interface FetchDependency {
  fetchImpl?: typeof fetch
}
