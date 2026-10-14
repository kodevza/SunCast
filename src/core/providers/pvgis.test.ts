import { describe, expect, it, vi } from 'vitest'
import { extractPvgisFixedAnnualYield, extractPvgisFixedDailyYieldByMonth, extractPvgisFixedMonthlyYield, fetchPvgisDailyProduction, fetchPvgisFixedAnnualYield } from './pvgis'

describe('core PVGIS provider', () => {
  it('extracts finite annual and monthly yields', () => {
    const payload = { outputs: { monthly: { fixed: [{ E_m: 39.09 }, { E_m: 54.58 }] }, totals: { fixed: { E_y: 1125.46 } } } }
    expect(extractPvgisFixedAnnualYield(payload)).toBe(1125.46)
    expect(extractPvgisFixedMonthlyYield(payload)).toEqual([39.09, 54.58])
  })

  it('extracts average daily output into calendar-month positions', () => {
    const payload = { outputs: { monthly: { fixed: [{ month: 2, E_d: 3.2, E_m: 89.6 }, { month: 1, E_d: 1.5, E_m: 46.5 }] } } }
    expect(extractPvgisFixedDailyYieldByMonth(payload).slice(0, 2)).toEqual([1.5, 3.2])
  })

  it('requests PVGIS through the supplied fetch implementation', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ outputs: { monthly: { fixed: [{ E_m: 220.41 }] }, totals: { fixed: { E_y: 1125.46 } } } }), { status: 200 }))
    await expect(fetchPvgisFixedAnnualYield({ latDeg: 52.2, lonDeg: 21, kwp: 8.75, roofPitchDeg: 35, roofAzimuthDeg: 140, year: 2023 }, { fetchImpl }))
      .resolves.toMatchObject({ annualYieldKwh: 1125.46, monthlyYieldKwh: [220.41] })
    const requestedUrl = (fetchImpl.mock.calls as unknown as Array<[URL]>)[0]?.[0]
    expect(requestedUrl).toBeDefined()
    expect(new URL(String(requestedUrl)).searchParams.get('startyear')).toBe('2023')
  })

  it('uses a caller-supplied API gateway base URL', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ outputs: { monthly: { fixed: [] }, totals: { fixed: { E_y: 1 } } } }), { status: 200 }))
    await fetchPvgisFixedAnnualYield(
      { latDeg: 52.2, lonDeg: 21, kwp: 1, roofPitchDeg: 35, roofAzimuthDeg: 180 },
      { fetchImpl, apiBaseUrl: 'https://suncast-pvgis-apim.azure-api.net/api/v5_3/' },
    )
    const requestedUrl = (fetchImpl.mock.calls as unknown as Array<[URL]>)[0]?.[0]
    expect(String(requestedUrl)).toMatch(/^https:\/\/suncast-pvgis-apim\.azure-api\.net\/api\/v5_3\/PVcalc\?/)
  })

  it('sums hourly PV power for the requested calendar day', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ outputs: { hourly: [
      { time: '20230621:0010', P: 500 }, { time: '20230621:0110', P: 1500 }, { time: '20230622:0010', P: 999 },
    ] } }), { status: 200 }))
    await expect(fetchPvgisDailyProduction({ latDeg: 52.2, lonDeg: 21, kwp: 4, roofPitchDeg: 35, roofAzimuthDeg: 180, dateIso: '2023-06-21' }, { fetchImpl })).resolves.toBe(2)
    const requestedUrl = (fetchImpl.mock.calls as unknown as Array<[URL]>)[0]?.[0]
    expect(new URL(String(requestedUrl)).pathname).toBe('/api/v5_3/seriescalc')
  })
})
