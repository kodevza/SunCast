import { describe, expect, it, vi } from 'vitest'
import { getPvgisPvcalc } from './pvgisClient'

describe('pvgisClient', () => {
  it('builds PVcalc query params and returns raw payload', async () => {
    let capturedUrl: URL | null = null
    const sampleResponse = {
      inputs: {
        location: {
          latitude: 52.2297,
          longitude: 21.0122,
        },
      },
      outputs: {
        totals: {
          fixed: {
            E_y: 1234.5,
            E_m: 102.875,
            H_i: 1180.2,
          },
        },
      },
      meta: {
        version: 'v5_3',
      },
    }
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (input instanceof URL) {
        capturedUrl = input
      }
      return new Response(JSON.stringify(sampleResponse), { status: 200 })
    })

    const payload = await getPvgisPvcalc({
      latDeg: 52.2297,
      lonDeg: 21.0122,
      peakPowerKw: 8.75,
      lossPercent: 14,
      angleDeg: 35,
      aspectDeg: 140,
      fetchImpl,
    })

    expect(payload).toEqual(sampleResponse)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(capturedUrl).toBeInstanceOf(URL)
    const serializedUrl = capturedUrl!.toString()
    expect(serializedUrl).toContain('https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?')
    expect(serializedUrl).toContain('lat=52.229700')
    expect(serializedUrl).toContain('lon=21.012200')
    expect(serializedUrl).toContain('peakpower=8.750')
    expect(serializedUrl).toContain('loss=14.00')
    expect(serializedUrl).toContain('angle=35.00')
    expect(serializedUrl).toContain('aspect=-40.00')
    expect(serializedUrl).toContain('fixed=1')
    expect(serializedUrl).toContain('outputformat=json')
    expect(serializedUrl).toContain('browser=0')
  })

  it('throws when response status is not ok', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 503 }))

    await expect(
      getPvgisPvcalc({
        latDeg: 52.2297,
        lonDeg: 21.0122,
        peakPowerKw: 8.75,
        lossPercent: 14,
        angleDeg: 35,
        aspectDeg: 140,
        fetchImpl,
      }),
    ).rejects.toThrow('PVGIS request failed with HTTP 503')
  })
})
