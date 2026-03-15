export interface PhotonFeature {
  geometry?: {
    coordinates?: unknown
  }
  properties?: {
    name?: string
    street?: string
    housenumber?: string
    city?: string
    state?: string
    country?: string
  }
}

export interface PhotonResponse {
  features?: PhotonFeature[]
}

interface PhotonSearchPlacesArgs {
  query: string
  limit: number
  lang?: string
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}

const PHOTON_SEARCH_URL = 'https://photon.komoot.io/api/'

export async function searchPhotonPlaces({
  query,
  limit,
  lang,
  signal,
  fetchImpl = fetch,
}: PhotonSearchPlacesArgs): Promise<PhotonResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  })
  if (lang) {
    params.set('lang', lang)
  }

  const response = await fetchImpl(`${PHOTON_SEARCH_URL}?${params.toString()}`, {
    method: 'GET',
    signal,
  })

  if (!response.ok) {
    throw new Error(`Photon request failed (${response.status})`)
  }

  return (await response.json()) as PhotonResponse
}
