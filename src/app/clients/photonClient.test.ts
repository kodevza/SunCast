import { describe, expect, it, vi } from 'vitest'
import { searchPhotonPlaces } from './photonClient'

describe('photonClient', () => {
  it('builds query params and returns raw payload', async () => {
    let capturedUrl = ''
    let capturedInit: RequestInit | undefined
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = typeof input === 'string' ? input : input.toString()
      capturedInit = init
      return new Response(
        JSON.stringify({
          features: [{ geometry: { coordinates: [21.01, 52.22] }, properties: { name: 'Warsaw' } }],
        }),
        { status: 200 },
      )
    })

    const payload = await searchPhotonPlaces({
      query: 'warsaw',
      limit: 3,
      lang: 'pl',
      fetchImpl,
    })

    expect(payload.features).toHaveLength(1)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(capturedUrl).toContain('https://photon.komoot.io/api/?')
    expect(capturedUrl).toContain('q=warsaw')
    expect(capturedUrl).toContain('limit=3')
    expect(capturedUrl).toContain('lang=pl')
    expect(capturedInit).toMatchObject({ method: 'GET' })
  })

  it('throws when response status is not ok', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 503 }))

    await expect(
      searchPhotonPlaces({
        query: 'warsaw',
        limit: 5,
        fetchImpl,
      }),
    ).rejects.toThrow('Photon request failed (503)')
  })
})
