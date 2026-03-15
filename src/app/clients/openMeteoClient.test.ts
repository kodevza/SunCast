import { describe, expect, it, vi } from 'vitest'
import { getOpenMeteoForecast } from './openMeteoClient'

describe('openMeteoClient', () => {
  it('builds query params and returns raw payload', async () => {
    let capturedUrl: URL | null = null
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (input instanceof URL) {
        capturedUrl = input
      }
      return new Response(
        JSON.stringify({
          hourly: {
            time: ['2026-03-07T11:00'],
            global_tilted_irradiance: [700],
          },
        }),
        { status: 200 },
      )
    })

    const payload = await getOpenMeteoForecast({
      latDeg: 52.2297,
      lonDeg: 21.0122,
      tiltDeg: 35,
      azimuthDeg: 10,
      timeZone: 'UTC',
      startDateIso: '2026-03-07',
      endDateIso: '2026-03-07',
      fetchImpl,
    })

    expect(payload.hourly?.time).toEqual(['2026-03-07T11:00'])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(capturedUrl).toBeInstanceOf(URL)
    const serializedUrl = capturedUrl!.toString()
    expect(serializedUrl).toContain('https://api.open-meteo.com/v1/forecast?')
    expect(serializedUrl).toContain('latitude=52.229700')
    expect(serializedUrl).toContain('longitude=21.012200')
    expect(serializedUrl).toContain('tilt=35.00')
    expect(serializedUrl).toContain('azimuth=10.00')
    expect(serializedUrl).toContain('start_date=2026-03-07')
    expect(serializedUrl).toContain('end_date=2026-03-07')
  })

  it('throws when response status is not ok', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 500 }))

    await expect(
      getOpenMeteoForecast({
        latDeg: 52.2297,
        lonDeg: 21.0122,
        tiltDeg: 35,
        azimuthDeg: 10,
        timeZone: 'UTC',
        startDateIso: '2026-03-07',
        endDateIso: '2026-03-07',
        fetchImpl,
      }),
    ).rejects.toThrow('Forecast API request failed with HTTP 500')
  })
})
