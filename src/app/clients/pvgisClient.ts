export interface PvgisPvcalcLocation {
  latitude: number
  longitude: number
  elevation?: number
}

export interface PvgisPvcalcMeteoData {
  radiation_db: string
  meteo_db: string
  year_min: number
  year_max: number
  use_horizon: boolean
  horizon_db: string
}

export interface PvgisPvcalcFixedMountingSystem {
  slope: {
    value: number
    optimal: boolean
  }
  azimuth: {
    value: number
    optimal: boolean
  }
  type: string
}

export interface PvgisPvcalcPvModule {
  technology: string
  peak_power: number
  system_loss: number
}

export interface PvgisPvcalcEconomicData {
  system_cost: number | null
  interest: number | null
  lifetime: number | null
}

export interface PvgisPvcalcMonthlyFixedEntry {
  month: number
  E_d: number
  E_m: number
  'H(i)_d': number
  'H(i)_m': number
  SD_m: number
}

export interface PvgisPvcalcTotalsFixedEntry {
  E_d: number
  E_m: number
  E_y: number
  'H(i)_d': number
  'H(i)_m': number
  'H(i)_y': number
  SD_m: number
  SD_y: number
  l_aoi: number
  l_spec: string
  l_tg: number
  l_total: number
}

export interface PvgisPvcalcInputs {
  location?: PvgisPvcalcLocation
  meteo_data?: PvgisPvcalcMeteoData
  mounting_system?: {
    fixed?: PvgisPvcalcFixedMountingSystem
  }
  pv_module?: PvgisPvcalcPvModule
  economic_data?: PvgisPvcalcEconomicData
}

export interface PvgisPvcalcOutputs {
  monthly?: {
    fixed?: PvgisPvcalcMonthlyFixedEntry[]
  }
  totals?: {
    fixed?: PvgisPvcalcTotalsFixedEntry
  }
}

export interface PvgisPvcalcResponse {
  inputs?: PvgisPvcalcInputs
  outputs?: PvgisPvcalcOutputs
  meta?: Record<string, unknown>
  warnings?: unknown
  errors?: unknown
}

interface PvgisPvcalcArgs {
  latDeg: number
  lonDeg: number
  peakPowerKw: number
  lossPercent: number
  angleDeg: number
  aspectDeg: number
  outputformat?: 'csv' | 'json' | 'basic'
  browser?: 0 | 1
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}

const PVGIS_V53_PVCALC_URL = 'https://re.jrc.ec.europa.eu/api/v5_3/PVcalc'

function normalizeCompassAzimuthDeg(deg: number): number {
  let normalized = deg % 360
  if (normalized < 0) {
    normalized += 360
  }
  return normalized
}

function toPvgisAspectDeg(azimuthFromNorthDeg: number): number {
  const southCentered = normalizeCompassAzimuthDeg(azimuthFromNorthDeg) - 180
  if (southCentered > 180) {
    return southCentered - 360
  }
  if (southCentered <= -180) {
    return southCentered + 360
  }
  return southCentered
}

export async function getPvgisPvcalc({
  latDeg,
  lonDeg,
  peakPowerKw,
  lossPercent,
  angleDeg,
  aspectDeg,
  outputformat = 'json',
  browser = 0,
  signal,
  fetchImpl = fetch,
}: PvgisPvcalcArgs): Promise<PvgisPvcalcResponse> {
  const url = new URL(PVGIS_V53_PVCALC_URL)
  url.searchParams.set('lat', latDeg.toFixed(6))
  url.searchParams.set('lon', lonDeg.toFixed(6))
  url.searchParams.set('peakpower', peakPowerKw.toFixed(3))
  url.searchParams.set('loss', lossPercent.toFixed(2))
  url.searchParams.set('angle', angleDeg.toFixed(2))
  url.searchParams.set('aspect', toPvgisAspectDeg(aspectDeg).toFixed(2))
  url.searchParams.set('fixed', '1')
  url.searchParams.set('outputformat', outputformat)
  url.searchParams.set('browser', String(browser))

  const response = await fetchImpl(url, { signal })
  if (!response.ok) {
    throw new Error(`PVGIS request failed with HTTP ${response.status}`)
  }

  return (await response.json()) as PvgisPvcalcResponse
}
