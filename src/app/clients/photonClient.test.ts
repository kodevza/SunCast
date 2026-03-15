import { describe, expect, it, vi } from 'vitest'
import { searchPhotonPlaces } from './photonClient'

describe('photonClient', () => {
  it('builds query params and returns raw payload', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          features: [{ geometry: { coordinates: [21.01, 52.22] }, properties: { name: 'Warsaw' } }],
        }),
        { status: 200 },
      ),
    )

    const payload = await searchPhotonPlaces({
      query: 'warsaw',
      limit: 3,
      lang: 'pl',
      fetchImpl,
    })

    expect(payload.features).toHaveLength(1)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [requestUrl, requestInit] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(requestUrl).toContain('https://photon.komoot.io/api/?')
    expect(requestUrl).toContain('q=warsaw')
    expect(requestUrl).toContain('limit=3')
    expect(requestUrl).toContain('lang=pl')
    expect(requestInit).toMatchObject({ method: 'GET' })
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
