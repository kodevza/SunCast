export interface PvgisPvcalcResponse {
  outputs?: {
    monthly?: { fixed?: Array<{ month?: number; E_d?: number; E_m: number }> }
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
  /** Restricts PVGIS climate data to this calendar year when supplied. */
  year?: number
  signal?: AbortSignal
}

export interface PvgisRoofEstimateResult {
  annualYieldKwh: number | null
  monthlyYieldKwh: number[]
  dailyYieldKwhByMonth: number[]
  response: PvgisPvcalcResponse
}

const DEFAULT_PVGIS_API_BASE_URL = 'https://re.jrc.ec.europa.eu/api/v5_3'

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

export function extractPvgisFixedDailyYieldByMonth(response: PvgisPvcalcResponse): number[] {
  const yields = Array.from({ length: 12 }, () => Number.NaN)
  for (const [index, entry] of (response.outputs?.monthly?.fixed ?? []).entries()) {
    const monthIndex = Number.isInteger(entry.month) && entry.month! >= 1 && entry.month! <= 12
      ? entry.month! - 1
      : index
    const dailyYield = Number(entry.E_d)
    if (Number.isFinite(dailyYield)) yields[monthIndex] = dailyYield
  }
  return yields
}

export async function fetchPvgisFixedAnnualYield(
  { latDeg, lonDeg, kwp, roofPitchDeg, roofAzimuthDeg, lossPercent = 14, year, signal }: PvgisRoofEstimateInput,
  { fetchImpl = fetch, apiBaseUrl = DEFAULT_PVGIS_API_BASE_URL }: PvgisFetchDependency = {},
): Promise<PvgisRoofEstimateResult> {
  const url = pvgisApiUrl(apiBaseUrl, 'PVcalc')
  url.searchParams.set('lat', latDeg.toFixed(6))
  url.searchParams.set('lon', lonDeg.toFixed(6))
  url.searchParams.set('peakpower', kwp.toFixed(3))
  url.searchParams.set('loss', lossPercent.toFixed(2))
  url.searchParams.set('angle', roofPitchDeg.toFixed(2))
  url.searchParams.set('aspect', toPvgisAspectDeg(roofAzimuthDeg).toFixed(2))
  url.searchParams.set('fixed', '1')
  url.searchParams.set('outputformat', 'json')
  url.searchParams.set('browser', '0')
  if (year !== undefined) {
    url.searchParams.set('startyear', String(year))
    url.searchParams.set('endyear', String(year))
  }
  const response = await fetchImpl(url, { signal })
  if (!response.ok) throw new Error(`PVGIS request failed with HTTP ${response.status}`)
  const payload = await response.json() as PvgisPvcalcResponse
  return {
    annualYieldKwh: extractPvgisFixedAnnualYield(payload),
    monthlyYieldKwh: extractPvgisFixedMonthlyYield(payload),
    dailyYieldKwhByMonth: extractPvgisFixedDailyYieldByMonth(payload),
    response: payload,
  }
}

export interface PvgisFetchDependency {
  fetchImpl?: typeof fetch
  /** API base URL ending in `/api/v5_3`; browser callers use the API Management gateway. */
  apiBaseUrl?: string
}

function pvgisApiUrl(apiBaseUrl: string, operation: 'PVcalc' | 'seriescalc'): URL {
  return new URL(`${apiBaseUrl.replace(/\/+$/, '')}/${operation}`)
}

interface PvgisSeriescalcResponse {
  outputs?: { hourly?: Array<{ time?: string; P?: number }> }
}

function toPvgisDatePrefix(dateIso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso)
  return match ? `${match[1]}${match[2]}${match[3]}` : null
}

/** Returns kWh from PVGIS's actual hourly PV production records for one date. */
export async function fetchPvgisDailyProduction(
  { latDeg, lonDeg, kwp, roofPitchDeg, roofAzimuthDeg, lossPercent = 14, dateIso, signal }: PvgisRoofEstimateInput & { dateIso: string },
  { fetchImpl = fetch, apiBaseUrl = DEFAULT_PVGIS_API_BASE_URL }: PvgisFetchDependency = {},
): Promise<number> {
  const datePrefix = toPvgisDatePrefix(dateIso)
  if (!datePrefix) throw new Error('PVGIS daily production requires an ISO date (YYYY-MM-DD).')
  const year = Number(datePrefix.slice(0, 4))
  const url = pvgisApiUrl(apiBaseUrl, 'seriescalc')
  url.searchParams.set('lat', latDeg.toFixed(6))
  url.searchParams.set('lon', lonDeg.toFixed(6))
  url.searchParams.set('startyear', String(year))
  url.searchParams.set('endyear', String(year))
  url.searchParams.set('pvcalculation', '1')
  url.searchParams.set('peakpower', kwp.toFixed(3))
  url.searchParams.set('loss', lossPercent.toFixed(2))
  url.searchParams.set('angle', roofPitchDeg.toFixed(2))
  url.searchParams.set('aspect', toPvgisAspectDeg(roofAzimuthDeg).toFixed(2))
  url.searchParams.set('outputformat', 'json')
  url.searchParams.set('browser', '0')
  const response = await fetchImpl(url, { signal })
  if (!response.ok) throw new Error(`PVGIS request failed with HTTP ${response.status}`)
  const payload = await response.json() as PvgisSeriescalcResponse
  const hourlyOutput = payload.outputs?.hourly ?? []
  const hourlyPowers = hourlyOutput
    .filter((entry) => entry.time?.startsWith(datePrefix))
    .map((entry) => Number(entry.P))
    .filter(Number.isFinite)
  if (hourlyPowers.length === 0) throw new Error(`PVGIS returned no hourly production for ${dateIso}`)
  return hourlyPowers.reduce((sum, powerWatts) => sum + powerWatts / 1000, 0)
}
