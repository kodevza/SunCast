import { describe, expect, it, vi } from 'vitest'
import { getArcgisWorldImageryMetadata } from './arcgisWorldImageryClient'

describe('arcgisWorldImageryClient', () => {
  it('requests world imagery metadata and returns raw payload', async () => {
    let capturedUrl = ''
    let capturedInit: RequestInit | undefined
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = typeof input === 'string' ? input : input.toString()
      capturedInit = init
      return new Response(
        JSON.stringify({
          attribution: 'Maxar, Airbus DS',
        }),
        { status: 200 },
      )
    })

    const payload = await getArcgisWorldImageryMetadata({ fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(capturedUrl).toBe('https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer?f=pjson')
    expect(capturedInit).toMatchObject({ signal: undefined })
    expect(payload.attribution).toBe('Maxar, Airbus DS')
  })

  it('throws when response status is not ok', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 502 }))

    await expect(getArcgisWorldImageryMetadata({ fetchImpl })).rejects.toThrow(
      'ArcGIS metadata request failed with status 502',
    )
  })
})
