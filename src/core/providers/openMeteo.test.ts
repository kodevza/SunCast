import { describe, expect, it, vi } from 'vitest'
import { fetchOpenMeteoTiltedIrradiance, parseOpenMeteoTiltedIrradiancePayload } from './openMeteo'

describe('core Open-Meteo provider', () => {
  it('defensively parses only finite timestamp/value pairs', () => {
    expect(parseOpenMeteoTiltedIrradiancePayload({ hourly: { time: ['2026-03-07T10:00', 42], global_tilted_irradiance: [500, 300] } }))
      .toEqual([{ timestampIso: '2026-03-07T10:00', irradianceWm2: 500 }])
  })

  it('uses the supplied fetch implementation', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ hourly: { time: ['2026-03-07T11:00'], global_tilted_irradiance: [700] } }), { status: 200 }))
    await expect(fetchOpenMeteoTiltedIrradiance({ latDeg: 52.23, lonDeg: 21.01, roofPitchDeg: 35, roofAzimuthDeg: 180, timeZone: 'UTC', dateIso: '2026-03-07' }, { fetchImpl }))
      .resolves.toEqual([{ timestampIso: '2026-03-07T11:00', irradianceWm2: 700 }])
  })
})
