import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fetchPvgisDailyProduction, fetchPvgisFixedAnnualYield } from './pvgis'
import type { ForecastCliInput } from '../cliInput'

const localInputPath = resolve(process.cwd(), 'test.json')
const runLiveIntegration = process.env.RUN_PVGIS_LIVE_INTEGRATION === 'true' && existsSync(localInputPath)
const describeLive = runLiveIntegration ? describe : describe.skip

function readLocalRoof() {
  const input = JSON.parse(readFileSync(localInputPath, 'utf8')) as ForecastCliInput
  if (input.roofs.length !== 1) throw new Error('Local PVGIS integration fixture must contain exactly one roof.')
  return input.roofs[0]
}

function createRecordingFetch(urls: URL[]): typeof fetch {
  return async (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    urls.push(new URL(url))
    return fetch(input, init)
  }
}

describeLive('local PVGIS integration for test.json', () => {
  it('converts the local roof export into the same default-reference PVcalc request used by the UI', async () => {
    const roof = readLocalRoof()
    const urls: URL[] = []

    const estimate = await fetchPvgisFixedAnnualYield(roof, { fetchImpl: createRecordingFetch(urls) })

    expect(urls).toHaveLength(1)
    const params = urls[0].searchParams
    expect(urls[0].pathname).toBe('/api/v5_3/PVcalc')
    expect(Object.fromEntries(params)).toMatchObject({
      lat: roof.latDeg.toFixed(6),
      lon: roof.lonDeg.toFixed(6),
      peakpower: roof.kwp.toFixed(3),
      angle: '36.31',
      // PVGIS uses 0° south, positive west, negative east; UI roof azimuth uses north-clockwise degrees.
      aspect: '-66.49',
      loss: '14.00',
      fixed: '1',
      outputformat: 'json',
    })
    expect(params.get('startyear')).toBeNull()
    expect(params.get('endyear')).toBeNull()
    expect(estimate.monthlyYieldKwh).toHaveLength(12)
    expect(estimate.annualYieldKwh).toBeGreaterThan(0)
  })

  it('uses the same roof conversion for the exact-day hourly PVGIS request', async () => {
    const roof = readLocalRoof()
    const urls: URL[] = []

    const energyKwh = await fetchPvgisDailyProduction(
      { ...roof, dateIso: '2023-10-01' },
      { fetchImpl: createRecordingFetch(urls) },
    )

    expect(urls).toHaveLength(1)
    const params = urls[0].searchParams
    expect(urls[0].pathname).toBe('/api/v5_3/seriescalc')
    expect(Object.fromEntries(params)).toMatchObject({
      lat: roof.latDeg.toFixed(6),
      lon: roof.lonDeg.toFixed(6),
      peakpower: roof.kwp.toFixed(3),
      angle: '36.31',
      aspect: '-66.49',
      loss: '14.00',
      startyear: '2023',
      endyear: '2023',
      pvcalculation: '1',
      outputformat: 'json',
    })
    expect(energyKwh).toBeGreaterThan(0)
  })
})
