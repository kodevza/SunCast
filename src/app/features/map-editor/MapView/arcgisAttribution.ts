import { captureException, recordEvent } from '../../../../shared/observability/observability'

const ARCGIS_WORLD_IMAGERY_METADATA_URL =
  'https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer?f=pjson'

let cachedProviderAttribution: string | null | undefined
let inflightRequest: Promise<string | null> | null = null

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export async function fetchArcgisProviderAttribution(signal?: AbortSignal): Promise<string | null> {
  if (cachedProviderAttribution !== undefined) {
    return cachedProviderAttribution
  }

  if (!inflightRequest) {
    inflightRequest = (async () => {
      try {
        const response = await fetch(ARCGIS_WORLD_IMAGERY_METADATA_URL, { signal })
        if (!response.ok) {
          throw new Error(`ArcGIS metadata request failed with status ${response.status}`)
        }

        const payload = (await response.json()) as { attribution?: unknown; copyrightText?: unknown }
        const providerText = asNonEmptyString(payload.attribution) ?? asNonEmptyString(payload.copyrightText)
        if (!providerText) {
          recordEvent('map.arcgis_attribution_missing')
        }
        cachedProviderAttribution = providerText ?? null
        return cachedProviderAttribution
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error
        }
        captureException(error, { area: 'map-view', source: 'arcgis-attribution' })
        cachedProviderAttribution = null
        return null
      } finally {
        inflightRequest = null
      }
    })()
  }

  return inflightRequest
}
