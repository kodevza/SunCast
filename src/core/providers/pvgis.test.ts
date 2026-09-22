import { describe, expect, it, vi } from 'vitest'
import { extractPvgisFixedAnnualYield, extractPvgisFixedMonthlyYield, fetchPvgisFixedAnnualYield } from './pvgis'

describe('core PVGIS provider', () => {
  it('extracts finite annual and monthly yields', () => {
    const payload = { outputs: { monthly: { fixed: [{ E_m: 39.09 }, { E_m: 54.58 }] }, totals: { fixed: { E_y: 1125.46 } } } }
    expect(extractPvgisFixedAnnualYield(payload)).toBe(1125.46)
    expect(extractPvgisFixedMonthlyYield(payload)).toEqual([39.09, 54.58])
  })

  it('requests PVGIS through the supplied fetch implementation', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ outputs: { monthly: { fixed: [{ E_m: 220.41 }] }, totals: { fixed: { E_y: 1125.46 } } } }), { status: 200 }))
    await expect(fetchPvgisFixedAnnualYield({ latDeg: 52.2, lonDeg: 21, kwp: 8.75, roofPitchDeg: 35, roofAzimuthDeg: 140 }, { fetchImpl }))
      .resolves.toMatchObject({ annualYieldKwh: 1125.46, monthlyYieldKwh: [220.41] })
  })
})
