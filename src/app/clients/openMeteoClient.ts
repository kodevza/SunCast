export interface OpenMeteoForecastResponse {
  hourly?: {
    time?: unknown
    global_tilted_irradiance?: unknown
  }
}

interface OpenMeteoForecastArgs {
  latDeg: number
  lonDeg: number
  tiltDeg: number
  azimuthDeg: number
  timeZone: string
  startDateIso: string
  endDateIso: string
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

export async function getOpenMeteoForecast({
  latDeg,
  lonDeg,
  tiltDeg,
  azimuthDeg,
  timeZone,
  startDateIso,
  endDateIso,
  signal,
  fetchImpl = fetch,
}: OpenMeteoForecastArgs): Promise<OpenMeteoForecastResponse> {
  const url = new URL(OPEN_METEO_FORECAST_URL)
  url.searchParams.set('latitude', latDeg.toFixed(6))
  url.searchParams.set('longitude', lonDeg.toFixed(6))
  url.searchParams.set('hourly', 'global_tilted_irradiance')
  url.searchParams.set('tilt', tiltDeg.toFixed(2))
  url.searchParams.set('azimuth', azimuthDeg.toFixed(2))
  url.searchParams.set('timezone', timeZone)
  url.searchParams.set('start_date', startDateIso)
  url.searchParams.set('end_date', endDateIso)

  const response = await fetchImpl(url, { signal })
  if (!response.ok) {
    throw new Error(`Forecast API request failed with HTTP ${response.status}`)
  }

  return (await response.json()) as OpenMeteoForecastResponse
}
