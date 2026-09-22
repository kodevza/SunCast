import type { IrradianceSample } from '../production/forecast'

export interface OpenMeteoForecastResponse {
  hourly?: { time?: unknown; global_tilted_irradiance?: unknown }
}

export interface OpenMeteoTiltedIrradianceRequest {
  latDeg: number
  lonDeg: number
  roofPitchDeg: number
  roofAzimuthDeg: number
  timeZone: string
  dateIso: string
  signal?: AbortSignal
}

export interface FetchDependency {
  fetchImpl?: typeof fetch
}

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const FORECAST_CACHE_TTL_MS = 10 * 60 * 1000
const forecastCache = new Map<string, { samples: IrradianceSample[]; fetchedAtMs: number }>()

function normalizeAzimuthDeg(deg: number): number {
  const normalized = deg % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function toOpenMeteoAzimuthDeg(azimuthFromNorthDeg: number): number {
  const southCentered = normalizeAzimuthDeg(azimuthFromNorthDeg) - 180
  if (southCentered > 180) return southCentered - 360
  return southCentered <= -180 ? southCentered + 360 : southCentered
}

export function parseOpenMeteoTiltedIrradiancePayload(payload: unknown): IrradianceSample[] {
  const response = payload as OpenMeteoForecastResponse
  const time = Array.isArray(response?.hourly?.time) ? response.hourly.time : []
  const irradiance = Array.isArray(response?.hourly?.global_tilted_irradiance) ? response.hourly.global_tilted_irradiance : []
  const samples: IrradianceSample[] = []
  for (let index = 0; index < Math.min(time.length, irradiance.length); index += 1) {
    const timestampIso = typeof time[index] === 'string' ? time[index] : null
    const irradianceWm2 = Number(irradiance[index])
    if (timestampIso && Number.isFinite(irradianceWm2)) samples.push({ timestampIso, irradianceWm2 })
  }
  return samples
}

export async function fetchOpenMeteoTiltedIrradiance(
  { latDeg, lonDeg, roofPitchDeg, roofAzimuthDeg, timeZone, dateIso, signal }: OpenMeteoTiltedIrradianceRequest,
  { fetchImpl = fetch }: FetchDependency = {},
): Promise<IrradianceSample[]> {
  const cacheKey = [latDeg.toFixed(6), lonDeg.toFixed(6), roofPitchDeg.toFixed(2), roofAzimuthDeg.toFixed(2), timeZone, dateIso].join('|')
  const cached = forecastCache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAtMs <= FORECAST_CACHE_TTL_MS) return cached.samples
  const url = new URL(OPEN_METEO_FORECAST_URL)
  url.searchParams.set('latitude', latDeg.toFixed(6))
  url.searchParams.set('longitude', lonDeg.toFixed(6))
  url.searchParams.set('hourly', 'global_tilted_irradiance')
  url.searchParams.set('tilt', Math.max(0, Math.min(90, Number.isFinite(roofPitchDeg) ? roofPitchDeg : 0)).toFixed(2))
  url.searchParams.set('azimuth', toOpenMeteoAzimuthDeg(roofAzimuthDeg).toFixed(2))
  url.searchParams.set('timezone', timeZone)
  url.searchParams.set('start_date', dateIso)
  url.searchParams.set('end_date', dateIso)
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(url, { signal })
      if (!response.ok) throw new Error(`Forecast API request failed with HTTP ${response.status}`)
      const samples = parseOpenMeteoTiltedIrradiancePayload(await response.json())
      forecastCache.set(cacheKey, { samples, fetchedAtMs: Date.now() })
      return samples
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      lastError = error
      if (attempt === 0) await new Promise<void>((resolve) => setTimeout(resolve, 200))
    }
  }
  throw (lastError ?? new Error('Forecast API request failed'))
}
